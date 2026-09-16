"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "./db";
import { ensureCartSessionId, getCartSessionId } from "./cart";
import { getCurrentUser } from "./auth";
import { getShowPrices, getSampleThreshold } from "./settings";
import { LOCALE_COOKIE } from "./constants";

export async function setLocaleAction(locale: "vi" | "ko") {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale === "ko" ? "ko" : "vi", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

async function getOrCreateCart() {
  const sessionId = await ensureCartSessionId();
  const cart = await db.cart.upsert({
    where: { sessionId },
    create: { sessionId },
    update: {},
  });
  return cart;
}

export async function addToCartAction(variantId: string, quantity: number) {
  if (!(await getShowPrices())) {
    return { ok: false, error: "Cửa hàng đang ở chế độ xem tham khảo" };
  }
  const qty = Math.max(1, Math.min(99, Math.floor(quantity) || 1));
  const cart = await getOrCreateCart();
  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity: qty },
    update: { quantity: { increment: qty } },
  });
  revalidatePath("/cart");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setCartItemQtyAction(itemId: string, quantity: number) {
  const qty = Math.floor(quantity);
  if (qty <= 0) {
    await db.cartItem.delete({ where: { id: itemId } });
  } else {
    await db.cartItem.update({
      where: { id: itemId },
      data: { quantity: Math.min(99, qty) },
    });
  }
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function removeCartItemAction(itemId: string) {
  await db.cartItem.delete({ where: { id: itemId } }).catch(() => {});
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function goToCheckoutAction() {
  const sessionId = await getCartSessionId();
  if (!sessionId) redirect("/cart");
  redirect("/checkout");
}

// Phí ship Hàn → VN tính theo kg, NV báo sau khi cân đơn.

export async function placeOrderAction(formData: FormData) {
  if (!(await getShowPrices())) redirect("/products");
  const sessionId = await getCartSessionId();
  if (!sessionId) redirect("/cart");

  const cart = await db.cart.findUnique({
    where: { sessionId },
    include: {
      items: { include: { variant: { include: { product: { include: { images: true } }, inventory: true } } } },
    },
  });
  if (!cart || cart.items.length === 0) redirect("/cart");

  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const carrier = (g("carrier") === "GHTK" ? "GHTK" : "GHN") as "GHN" | "GHTK";
  const paymentMode = g("paymentMode") === "deposit" ? "deposit" : "full";
  const depositByAmount =
    paymentMode === "deposit" && g("depositMode") === "amount";
  const depositRatePct = Math.min(
    70,
    Math.max(30, Number(g("depositRate")) || 50),
  );
  const provider = (
    ["BANK_TRANSFER", "VNPAY", "MOMO", "ZALOPAY", "COD"].includes(g("provider"))
      ? g("provider")
      : "BANK_TRANSFER"
  ) as "BANK_TRANSFER" | "VNPAY" | "MOMO" | "ZALOPAY" | "COD";
  const couponCode = g("coupon").toUpperCase();

  // Tính tiền
  let subtotal = 0;
  const itemsData = cart.items.map((it) => {
    const now = Date.now();
    const inWindow =
      (!it.variant.saleStartsAt || it.variant.saleStartsAt.getTime() <= now) &&
      (!it.variant.saleEndsAt || it.variant.saleEndsAt.getTime() >= now);
    const unit =
      it.variant.salePrice != null && it.variant.salePrice < it.variant.price && inWindow
        ? it.variant.salePrice
        : it.variant.price;
    subtotal += unit * it.quantity;
    return {
      variantId: it.variantId,
      productName: it.variant.product.name,
      variantName: it.variant.name,
      unitPrice: unit,
      quantity: it.quantity,
      tint: it.variant.product.images[0]?.tint ?? "#EFEBE3",
    };
  });

  let discount = 0;
  if (couponCode) {
    const c = await db.coupon.findUnique({ where: { code: couponCode } });
    if (
      c &&
      c.active &&
      (!c.minSubtotal || subtotal >= c.minSubtotal) &&
      (!c.startsAt || c.startsAt.getTime() <= Date.now()) &&
      (!c.endsAt || c.endsAt.getTime() >= Date.now())
    ) {
      if (c.type === "PERCENT") discount = Math.round((subtotal * c.value) / 100);
      else if (c.type === "FIXED") discount = Math.min(c.value, subtotal);
    }
  }

  const afterDiscount = subtotal - discount;
  // Phí ship từ Hàn tính theo kg → NV nhập sau khi chốt đơn
  const shippingFee = 0;
  const total = afterDiscount + shippingFee;

  const sampleThreshold = await getSampleThreshold();
  const giftSample = subtotal >= sampleThreshold;

  const isPreorder = cart.items.some(
    (it) => it.variant.product.orderType === "PREORDER",
  );
  const orderType = isPreorder ? "PREORDER" : "INSTOCK";
  let depositRate: number;
  let depositAmount: number;
  if (paymentMode !== "deposit") {
    depositRate = 0;
    depositAmount = total;
  } else if (depositByAmount) {
    // Khách nhập thẳng số tiền cọc → chặn trong [10.000₫, tổng đơn], suy ra %
    const raw = Math.round(Number(g("depositAmount")) || 0);
    depositAmount = Math.min(total, Math.max(10000, raw));
    depositRate =
      total > 0 ? Math.max(1, Math.round((depositAmount / total) * 100)) : 0;
  } else {
    depositRate = depositRatePct;
    depositAmount = Math.round((total * depositRate) / 100);
  }
  const balanceAmount = total - depositAmount;

  const count = await db.order.count();
  const code = `BL${(count + 25891).toString().padStart(5, "0")}`;
  const currentUser = await getCurrentUser();

  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        code,
        userId: currentUser?.id ?? null,
        customerName: g("customerName") || currentUser?.name || "Khách",
        customerPhone: g("customerPhone"),
        customerEmail: g("customerEmail") || null,
        province: g("province"),
        district: g("district"),
        ward: g("ward"),
        addressLine: g("addressLine"),
        note: g("note") || null,
        shippingCarrier: carrier,
        shippingFee,
        subtotal,
        discount,
        couponCode: discount > 0 ? couponCode : null,
        total,
        orderType,
        depositRate,
        depositAmount,
        balanceAmount,
        balanceDueAt: isPreorder
          ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 21)
          : null,
        paymentStatus: "UNPAID",
        status: "PENDING",
        items: { create: itemsData },
        events: {
          create: {
            status: "PENDING",
            note:
              "Đơn được tạo · Phí ship từ Hàn: tính theo kg (NV báo sau)" +
              (giftSample ? " · Tặng mẫu thử (đơn đạt ngưỡng)" : ""),
          },
        },
        payments: {
          create: {
            kind: depositRate > 0 ? "DEPOSIT" : "FULL",
            provider,
            amount: depositAmount,
            status: "PENDING",
          },
        },
      },
    });

    // trừ tồn kho
    for (const it of cart.items) {
      if (it.variant.inventory) {
        await tx.inventory.update({
          where: { variantId: it.variantId },
          data: { quantity: { decrement: it.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            variantId: it.variantId,
            delta: -it.quantity,
            reason: "sale",
            note: `Đơn ${code}`,
          },
        });
      }
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    return created;
  });

  // Lưu địa chỉ cho khách đã đăng nhập (nếu chưa có địa chỉ mặc định)
  if (currentUser && g("addressLine")) {
    const hasDefault = await db.address.findFirst({
      where: { userId: currentUser.id, isDefault: true },
    });
    await db.address.create({
      data: {
        userId: currentUser.id,
        fullName: g("customerName") || currentUser.name,
        phone: g("customerPhone"),
        line1: g("addressLine"),
        ward: g("ward"),
        district: g("district"),
        province: g("province"),
        isDefault: !hasDefault,
      },
    });
  }

  // Chuyển khoản: sang trang hướng dẫn QR trước; còn lại (COD/ví mock) -> trang cảm ơn
  if (provider === "BANK_TRANSFER") {
    redirect(`/checkout/payment/${order.code}`);
  }
  redirect(`/checkout/success/${order.code}`);
}

/** Khách bấm "Tôi đã chuyển khoản" ở trang hướng dẫn thanh toán. */
export async function markTransferReportedAction(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) redirect("/products");
  const order = await db.order.findUnique({
    where: { code },
    include: { payments: { where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: 1 } },
  });
  const p = order?.payments[0];
  if (p && p.provider === "BANK_TRANSFER" && !p.reportedAt) {
    await db.payment.update({ where: { id: p.id }, data: { reportedAt: new Date() } });
    await db.orderStatusEvent.create({
      data: { orderId: order!.id, status: order!.status, note: "Khách báo đã chuyển khoản" },
    });
  }
  redirect(`/checkout/success/${code}`);
}
