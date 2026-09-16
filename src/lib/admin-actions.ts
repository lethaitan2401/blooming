"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { getCurrentUser } from "./auth";
import { PERMISSIONS, can } from "./rbac";
import { normPayMethod, PAY_METHOD_VI, type PayMethod } from "./constants";
import {
  getKrwRate,
  setKrwRate,
  krwToVnd,
  sellPrice,
  setBankInfo,
  setShowPrices,
  setSampleThreshold,
  setKrShipPerKg,
  setProductNameLang,
  type BankInfo,
} from "./settings";

async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Chưa đăng nhập");
  return user;
}

/**
 * Sửa giá bán / giá KM của biến thể.
 * - Có quyền price.approve  -> áp dụng ngay + ghi PriceHistory
 * - Chỉ có price.publish    -> tạo PriceChangeRequest (PENDING), giá live giữ nguyên
 */
export async function updateVariantPriceAction(
  variantId: string,
  field: "PRICE" | "SALE_PRICE",
  newValue: number | null,
): Promise<{ status: "applied" | "pending" | "denied" }> {
  const user = await requireStaff();
  const perms = user.role.permissions;
  if (!can(perms, PERMISSIONS.PRICE_PUBLISH))
    return { status: "denied" };

  const v = await db.productVariant.findUnique({ where: { id: variantId } });
  if (!v) return { status: "denied" };
  const oldValue = field === "PRICE" ? v.price : v.salePrice;
  const val =
    newValue == null || Number.isNaN(newValue) ? null : Math.max(0, Math.round(newValue));

  if (can(perms, PERMISSIONS.PRICE_APPROVE)) {
    await db.$transaction([
      db.productVariant.update({
        where: { id: variantId },
        data: field === "PRICE" ? { price: val ?? v.price } : { salePrice: val },
      }),
      db.priceHistory.create({
        data: {
          variantId,
          field,
          oldValue,
          newValue: val,
          changedBy: user.id,
          note: "Cập nhật trực tiếp",
        },
      }),
    ]);
    revalidatePath("/admin/products");
    return { status: "applied" };
  }

  await db.priceChangeRequest.create({
    data: {
      variantId,
      field,
      oldValue,
      newValue: val,
      requestedBy: user.id,
      status: "PENDING",
    },
  });
  revalidatePath("/admin/products");
  return { status: "pending" };
}

export async function updateVariantStockAction(
  variantId: string,
  quantity: number,
): Promise<{ ok: boolean }> {
  const user = await requireStaff();
  if (
    !can(user.role.permissions, PERMISSIONS.INVENTORY_WRITE) &&
    !can(user.role.permissions, PERMISSIONS.PRODUCT_WRITE)
  )
    return { ok: false };

  const inv = await db.inventory.findUnique({ where: { variantId } });
  const q = Math.max(0, Math.round(quantity));
  const delta = q - (inv?.quantity ?? 0);

  await db.inventory.upsert({
    where: { variantId },
    create: { variantId, quantity: q },
    update: { quantity: q },
  });
  if (delta !== 0) {
    await db.stockMovement.create({
      data: { variantId, delta, reason: "adjust", note: "Sửa nhanh (admin)" },
    });
  }
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function updateProductStatusAction(
  productId: string,
  status: "DRAFT" | "ACTIVE" | "HIDDEN",
): Promise<{ ok: boolean }> {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.PRODUCT_WRITE)) return { ok: false };
  await db.product.update({ where: { id: productId }, data: { status } });
  revalidatePath("/admin/products");
  return { ok: true };
}

/** Đổi danh mục của sản phẩm (phân loại) */
export async function updateProductCategoryAction(
  productId: string,
  categorySlug: string,
): Promise<{ ok: boolean }> {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.PRODUCT_WRITE)) return { ok: false };
  const cat = await db.category.findUnique({ where: { slug: categorySlug } });
  if (!cat) return { ok: false };
  await db.product.update({
    where: { id: productId },
    data: { categoryId: cat.id },
  });
  revalidatePath("/admin/products");
  revalidatePath("/products");
  return { ok: true };
}

/**
 * Bật/tắt nhãn hiển thị trên trang chủ + navbar:
 *  - "best" -> isBestSeller  (khối "Bán chạy" + navbar Bán chạy)
 *  - "new"  -> isNew         (khối "Hàng mới về" + navbar Hàng mới)
 */
export async function toggleProductFlagAction(
  productId: string,
  flag: "best" | "new",
  enabled: boolean,
): Promise<{ ok: boolean }> {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.PRODUCT_WRITE)) return { ok: false };
  await db.product.update({
    where: { id: productId },
    data: flag === "best" ? { isBestSeller: enabled } : { isNew: enabled },
  });
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  revalidatePath("/products");
  return { ok: true };
}

/** Đổi thương hiệu của sản phẩm */
export async function updateProductBrandAction(
  productId: string,
  brandSlug: string,
): Promise<{ ok: boolean }> {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.PRODUCT_WRITE)) return { ok: false };
  const brand = await db.brand.findUnique({ where: { slug: brandSlug } });
  if (!brand) return { ok: false };
  await db.product.update({
    where: { id: productId },
    data: { brandId: brand.id },
  });
  revalidatePath("/admin/products");
  return { ok: true };
}

/**
 * Sửa giá nhập (KRW) của biến thể → tự tính lại giá vốn VND theo tỉ giá hiện tại.
 * Chỉ nhân viên có quyền `cost.view` (Super Admin, Quản lý, Kế toán).
 */
export async function updateVariantCostKrwAction(
  variantId: string,
  costKrw: number,
): Promise<{ ok: boolean; costPrice?: number; price?: number }> {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.COST_VIEW))
    return { ok: false };
  const krw = Math.max(0, Math.round(costKrw));
  const rate = await getKrwRate();
  const v = await db.productVariant.findUnique({ where: { id: variantId } });
  if (!v) return { ok: false };
  const costPrice = krwToVnd(krw, rate);
  const price = sellPrice(costPrice, v.markupPct) || v.price;
  await db.productVariant.update({
    where: { id: variantId },
    data: { costKrw: krw, costPrice, price },
  });
  revalidatePath("/admin/products");
  revalidatePath("/admin/reports");
  revalidatePath("/products");
  return { ok: true, costPrice, price };
}

/**
 * Sửa % lãi (markup) của biến thể → tính lại giá bán = giá vốn × (1 + %/100).
 * Chỉ nhân viên có `cost.view`.
 */
export async function updateVariantMarkupAction(
  variantId: string,
  markupPct: number,
): Promise<{ ok: boolean; price?: number }> {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.COST_VIEW)) return { ok: false };
  const pct = Math.max(0, Math.min(500, Math.round(markupPct)));
  const v = await db.productVariant.findUnique({ where: { id: variantId } });
  if (!v) return { ok: false };
  const price = sellPrice(v.costPrice, pct) || v.price;
  await db.productVariant.update({
    where: { id: variantId },
    data: { markupPct: pct, price },
  });
  revalidatePath("/admin/products");
  revalidatePath("/products");
  return { ok: true, price };
}

/**
 * Đặt tỉ giá ₩→₫ và tính lại giá vốn VND cho MỌI biến thể (theo costKrw đã lưu).
 */
export async function updateKrwRateAction(
  rate: number,
): Promise<{ ok: boolean; updated?: number }> {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.COST_VIEW))
    return { ok: false };
  const r = Math.round((Number(rate) || 0) * 100) / 100;
  if (r <= 0 || r > 1000) return { ok: false };
  await setKrwRate(r);

  const variants = await db.productVariant.findMany({
    select: { id: true, costKrw: true, markupPct: true },
  });
  const withCost = variants.filter((v) => v.costKrw > 0);
  await db.$transaction(
    withCost.map((v) => {
      const costPrice = krwToVnd(v.costKrw, r);
      return db.productVariant.update({
        where: { id: v.id },
        data: { costPrice, price: sellPrice(costPrice, v.markupPct) || undefined },
      });
    }),
  );
  revalidatePath("/admin/products");
  revalidatePath("/admin/reports");
  revalidatePath("/products");
  return { ok: true, updated: withCost.length };
}

/** Duyệt / từ chối một yêu cầu đổi giá */
export async function reviewPriceRequestAction(
  requestId: string,
  decision: "APPROVE" | "REJECT",
): Promise<{ ok: boolean }> {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.PRICE_APPROVE)) return { ok: false };

  const req = await db.priceChangeRequest.findUnique({ where: { id: requestId } });
  if (!req || req.status !== "PENDING") return { ok: false };

  if (decision === "APPROVE") {
    await db.$transaction([
      db.productVariant.update({
        where: { id: req.variantId },
        data:
          req.field === "PRICE"
            ? { price: req.newValue ?? undefined }
            : { salePrice: req.newValue },
      }),
      db.priceHistory.create({
        data: {
          variantId: req.variantId,
          field: req.field,
          oldValue: req.oldValue,
          newValue: req.newValue,
          changedBy: user.id,
          note: "Duyệt yêu cầu đổi giá",
        },
      }),
      db.priceChangeRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", reviewedBy: user.id, reviewedAt: new Date() },
      }),
    ]);
  } else {
    await db.priceChangeRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", reviewedBy: user.id, reviewedAt: new Date() },
    });
  }
  revalidatePath("/admin/products");
  return { ok: true };
}

const NEXT_STATUS: Record<string, string> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PACKING",
  PACKING: "HANDED_TO_CARRIER",
  HANDED_TO_CARRIER: "DELIVERING",
  DELIVERING: "COMPLETED",
};

export async function advanceOrderAction(orderId: string) {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.ORDER_WRITE)) return { ok: false };
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false };
  const next = NEXT_STATUS[order.status];
  if (!next) return { ok: false };
  await db.$transaction([
    db.order.update({
      where: { id: orderId },
      data: { status: next as never },
    }),
    db.orderStatusEvent.create({
      data: { orderId, status: next as never, byUserId: user.id },
    }),
  ]);
  revalidatePath("/admin/orders");
  return { ok: true };
}

export async function createShipmentAction(orderId: string) {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.SHIPPING_WRITE)) return { ok: false };
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false };
  const tracking = `${order.shippingCarrier}${Math.floor(
    1e9 + Math.random() * 9e9,
  )}`;
  await db.shipment.upsert({
    where: { orderId },
    create: {
      orderId,
      carrier: order.shippingCarrier,
      trackingCode: tracking,
      status: "CREATED",
      codAmount: order.paymentStatus === "PAID" ? 0 : order.balanceAmount,
      events: { create: { status: "CREATED", description: "Đã tạo vận đơn" } },
    },
    update: { trackingCode: tracking, status: "CREATED" },
  });
  revalidatePath("/admin/orders");
  return { ok: true, tracking };
}

/* ---------------- Tạo đơn hàng thủ công ---------------- */

// Ship nội địa miễn phí. shippingFee ở đơn = phí ship từ Hàn (NV nhập).

/**
 * Admin tạo đơn thủ công (đơn qua điện thoại/Zalo/Facebook…).
 * items = JSON [{ variantId, quantity, unitPrice }]
 */
export async function createManualOrderAction(formData: FormData) {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.ORDER_WRITE)) {
    throw new Error("Không có quyền tạo đơn");
  }

  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const num = (k: string) => Math.max(0, Math.round(Number(g(k)) || 0));

  let rawItems: {
    variantId?: string | null;
    name?: string;
    quantity: number;
    unitPrice: number;
    imageUrl?: string | null;
  }[];
  try {
    rawItems = JSON.parse(g("items"));
  } catch {
    rawItems = [];
  }
  const items = rawItems
    .map((i) => ({
      variantId: i.variantId || null,
      name: (i.name || "").trim().slice(0, 200),
      quantity: Math.min(999, Math.round(i.quantity)),
      unitPrice: Math.max(0, Math.round(i.unitPrice)),
      imageUrl:
        typeof i.imageUrl === "string" && i.imageUrl.trim()
          ? i.imageUrl.trim().slice(0, 500)
          : null,
    }))
    // SP có sẵn: cần variantId. SP ngoài danh sách: cần tên + giá > 0.
    .filter((i) =>
      i.quantity > 0 && (i.variantId ? true : i.name !== "" && i.unitPrice > 0),
    );
  if (items.length === 0) throw new Error("Đơn phải có ít nhất 1 sản phẩm");

  const variantIds = items.map((i) => i.variantId).filter((v): v is string => !!v);
  const variants = variantIds.length
    ? await db.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: {
          product: { include: { images: { orderBy: { order: "asc" }, take: 1 } } },
          inventory: true,
        },
      })
    : [];
  const vmap = new Map(variants.map((v) => [v.id, v]));

  const carrier = (g("carrier") === "GHTK" ? "GHTK" : "GHN") as "GHN" | "GHTK";
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discount = Math.min(num("discount"), subtotal);
  const shippingFee = num("shippingFee"); // phí ship từ Hàn; trống = 0
  const total = subtotal - discount + shippingFee;

  const orderType = g("orderType") === "PREORDER" ? "PREORDER" : "INSTOCK";
  const payState = g("paymentStatus"); // UNPAID | DEPOSIT_PAID | PAID
  const depositRate =
    payState === "DEPOSIT_PAID"
      ? Math.min(90, Math.max(10, num("depositRate") || 50))
      : 0;
  const depositAmount =
    payState === "PAID"
      ? total
      : payState === "DEPOSIT_PAID"
        ? Math.round((total * depositRate) / 100)
        : 0;
  const balanceAmount = total - depositAmount;
  const paymentStatus = (["UNPAID", "DEPOSIT_PAID", "PAID"].includes(payState)
    ? payState
    : "UNPAID") as "UNPAID" | "DEPOSIT_PAID" | "PAID";
  const provider = normPayMethod(g("provider"));

  const initialStatus = (
    ["PENDING", "CONFIRMED", "PACKING"].includes(g("status")) ? g("status") : "CONFIRMED"
  ) as "PENDING" | "CONFIRMED" | "PACKING";

  const linkedUser = g("customerEmail")
    ? await db.user.findUnique({ where: { email: g("customerEmail").toLowerCase() } })
    : null;

  const count = await db.order.count();
  const code = `BL${(count + 25891).toString().padStart(5, "0")}`;

  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        code,
        userId: linkedUser?.id ?? null,
        customerName: g("customerName") || "Khách",
        customerPhone: g("customerPhone"),
        customerEmail: g("customerEmail") || null,
        province: g("province"),
        district: g("district"),
        ward: g("ward"),
        addressLine: g("addressLine"),
        note: g("note") ? `[Tạo thủ công] ${g("note")}` : "Đơn tạo thủ công",
        shippingCarrier: carrier,
        shippingFee,
        subtotal,
        discount,
        couponCode: null,
        total,
        orderType,
        depositRate,
        depositAmount,
        balanceAmount,
        balanceDueAt:
          orderType === "PREORDER"
            ? new Date(Date.now() + 21 * 864e5)
            : null,
        paymentStatus,
        status: initialStatus,
        items: {
          create: items.map((i) => {
            const v = i.variantId ? vmap.get(i.variantId) : undefined;
            return {
              variantId: v ? i.variantId : null,
              productName: v?.product.name ?? (i.name || "Sản phẩm"),
              variantName: v?.name ?? "",
              unitPrice: i.unitPrice,
              quantity: i.quantity,
              tint: v?.product.images[0]?.tint ?? "#EFEBE3",
              imageUrl: i.imageUrl ?? v?.product.images[0]?.url ?? null,
            };
          }),
        },
        events: {
          create: {
            status: initialStatus,
            note: `Tạo thủ công bởi ${user.name}`,
            byUserId: user.id,
          },
        },
        payments:
          paymentStatus === "UNPAID"
            ? {
                create: {
                  kind: "FULL",
                  provider,
                  amount: total,
                  status: "PENDING",
                },
              }
            : {
                create: {
                  kind: paymentStatus === "PAID" ? "FULL" : "DEPOSIT",
                  provider,
                  amount: depositAmount || total,
                  status: "PAID",
                  paidAt: new Date(),
                },
              },
      },
    });

    // trừ tồn kho (bỏ qua SP ngoài danh sách)
    for (const i of items) {
      if (!i.variantId) continue;
      const v = vmap.get(i.variantId);
      if (v?.inventory) {
        await tx.inventory.update({
          where: { variantId: i.variantId },
          data: { quantity: { decrement: i.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            variantId: i.variantId,
            delta: -i.quantity,
            reason: "sale",
            note: `Đơn ${code} (thủ công)`,
          },
        });
      }
    }
    return created;
  });

  revalidatePath("/admin/orders");
  redirect(`/admin/orders?id=${order.id}`);
}

/* ---------------- Thanh toán / đặt cọc ---------------- */

type PayState = "UNPAID" | "DEPOSIT_PAID" | "PAID";

const PAY_VI: Record<PayState, string> = {
  UNPAID: "Chưa thanh toán",
  DEPOSIT_PAID: "Đã đặt cọc",
  PAID: "Đã thanh toán đủ",
};

/**
 * Tính lại tiền cọc / số dư theo tổng đơn + trạng thái thanh toán.
 *  - mode "amount": nhập thẳng số tiền cọc → suy ra % để các chỗ khác (`depositRate > 0`) vẫn chạy
 *  - mode "percent": nhập % → suy ra số tiền
 */
function computeDeposit(
  total: number,
  payState: PayState,
  opts: { mode?: "percent" | "amount"; rate?: number; amount?: number },
): { depositRate: number; depositAmount: number; balanceAmount: number } {
  if (payState === "PAID")
    return { depositRate: 0, depositAmount: total, balanceAmount: 0 };
  if (payState === "DEPOSIT_PAID") {
    let amount: number;
    let rate: number;
    if (opts.mode === "amount" && (opts.amount || 0) > 0) {
      amount = Math.min(total, Math.max(1, Math.round(opts.amount || 0)));
      rate = total > 0 ? Math.max(1, Math.round((amount / total) * 100)) : 0;
    } else {
      rate = Math.min(95, Math.max(5, Math.round(opts.rate || 50)));
      amount = Math.round((total * rate) / 100);
    }
    return {
      depositRate: rate,
      depositAmount: amount,
      balanceAmount: Math.max(0, total - amount),
    };
  }
  return { depositRate: 0, depositAmount: 0, balanceAmount: total };
}

/** Đảm bảo đơn có 1 dòng Payment phản ánh khoản đã thu (cọc hoặc đủ). */
async function reconcilePayment(
  tx: Prisma.TransactionClient,
  orderId: string,
  payState: PayState,
  paidAmount: number,
  method: PayMethod = "BANK_TRANSFER",
) {
  if (payState === "UNPAID") return;
  const kind = payState === "PAID" ? "FULL" : "DEPOSIT";
  const paid = await tx.payment.findFirst({
    where: { orderId, status: "PAID" },
    orderBy: { createdAt: "desc" },
  });
  if (paid) {
    await tx.payment.update({
      where: { id: paid.id },
      data: { amount: paidAmount, kind, provider: method },
    });
    return;
  }
  const pending = await tx.payment.findFirst({
    where: { orderId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  if (pending) {
    await tx.payment.update({
      where: { id: pending.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        amount: paidAmount,
        kind,
        provider: method,
      },
    });
  } else {
    await tx.payment.create({
      data: {
        orderId,
        kind,
        provider: method,
        amount: paidAmount,
        status: "PAID",
        paidAt: new Date(),
      },
    });
  }
}

/**
 * Đổi nhanh trạng thái thanh toán của đơn (khách đã chuyển tiền / đã đưa cọc…).
 * Dùng ở khối chi tiết đơn — không cần vào form sửa đơn.
 */
export async function setOrderPaymentAction(input: {
  orderId: string;
  paymentStatus: PayState;
  depositAmount?: number;
  method?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.ORDER_WRITE)) {
    return { ok: false, error: "Không có quyền" };
  }
  const payState: PayState = (["UNPAID", "DEPOSIT_PAID", "PAID"] as const).includes(
    input.paymentStatus,
  )
    ? input.paymentStatus
    : "UNPAID";
  const order = await db.order.findUnique({ where: { id: input.orderId } });
  if (!order) return { ok: false, error: "Không tìm thấy đơn" };

  const { depositRate, depositAmount, balanceAmount } = computeDeposit(
    order.total,
    payState,
    input.depositAmount && input.depositAmount > 0
      ? { mode: "amount", amount: input.depositAmount }
      : { mode: "percent", rate: order.depositRate || 50 },
  );
  const method = normPayMethod(input.method);
  const nextStatus =
    payState !== "UNPAID" && order.status === "PENDING"
      ? "CONFIRMED"
      : order.status;

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: payState,
        depositRate,
        depositAmount,
        balanceAmount,
        status: nextStatus as never,
      },
    });
    await reconcilePayment(
      tx,
      order.id,
      payState,
      payState === "PAID" ? order.total : depositAmount,
      method,
    );
    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        status: nextStatus as never,
        note:
          payState === "UNPAID"
            ? `Cập nhật thanh toán: ${PAY_VI[payState]} bởi ${user.name}`
            : `Cập nhật thanh toán: ${PAY_VI[payState]} · ${PAY_METHOD_VI[method]} bởi ${user.name}`,
        byUserId: user.id,
      },
    });
  });
  revalidatePath("/admin/orders");
  return { ok: true };
}

/* ---------------- Sửa đơn hàng ---------------- */

const EDIT_LOCKED_STATUS = new Set([
  "COMPLETED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
]);

/**
 * Admin sửa đơn: thông tin người nhận, địa chỉ, ghi chú, ĐVVC + phí ship,
 * giảm giá, và danh sách sản phẩm (thêm / bớt / đổi SL / đổi giá).
 * Tự tính lại tạm tính / tổng / số dư và cân đối tồn kho theo chênh lệch.
 */
export async function updateOrderAction(formData: FormData) {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.ORDER_WRITE)) {
    throw new Error("Không có quyền sửa đơn");
  }

  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const num = (k: string) => Math.max(0, Math.round(Number(g(k)) || 0));

  const orderId = g("orderId");
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new Error("Không tìm thấy đơn");
  if (EDIT_LOCKED_STATUS.has(order.status))
    throw new Error("Đơn đã kết thúc, không sửa được");

  type InItem = {
    id?: string;
    variantId?: string | null;
    name?: string;
    quantity: number;
    unitPrice: number;
    imageUrl?: string | null;
  };
  let raw: InItem[];
  try {
    raw = JSON.parse(g("items"));
  } catch {
    raw = [];
  }
  const items = raw
    .map((i) => ({
      id: i.id || null,
      variantId: i.variantId || null,
      name: (i.name || "").trim().slice(0, 200),
      quantity: Math.min(999, Math.max(0, Math.round(i.quantity))),
      unitPrice: Math.max(0, Math.round(i.unitPrice)),
      imageUrl:
        typeof i.imageUrl === "string" && i.imageUrl.trim()
          ? i.imageUrl.trim().slice(0, 500)
          : null,
    }))
    .filter((i) => i.quantity > 0 && (i.variantId || i.name));
  if (items.length === 0) throw new Error("Đơn phải còn ít nhất 1 sản phẩm");

  // Nạp thông tin biến thể cho các dòng có variantId
  const vIds = [
    ...new Set(items.map((i) => i.variantId).filter((v): v is string => !!v)),
  ];
  const variants = vIds.length
    ? await db.productVariant.findMany({
        where: { id: { in: vIds } },
        include: {
          product: { include: { images: { orderBy: { order: "asc" }, take: 1 } } },
        },
      })
    : [];
  const vmap = new Map(variants.map((v) => [v.id, v]));
  const oldById = new Map(order.items.map((it) => [it.id, it]));

  const carrier = (g("carrier") === "GHTK" ? "GHTK" : "GHN") as "GHN" | "GHTK";
  const shippingFee =
    g("shippingFee") === "" ? order.shippingFee : num("shippingFee");
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discount = Math.min(num("discount"), subtotal);
  const total = subtotal - discount + shippingFee;

  // Thanh toán / đặt cọc — sửa được ngay trong form
  const rawPay = g("paymentStatus");
  const payState: PayState = (["UNPAID", "DEPOSIT_PAID", "PAID"] as const).includes(
    rawPay as PayState,
  )
    ? (rawPay as PayState)
    : order.paymentStatus === "REFUNDED"
      ? "UNPAID"
      : (order.paymentStatus as PayState);
  const { depositRate, depositAmount, balanceAmount } = computeDeposit(
    total,
    payState,
    {
      mode: g("depositMode") === "amount" ? "amount" : "percent",
      rate: num("depositRate") || order.depositRate,
      amount: num("depositAmount"),
    },
  );
  const payMethod = normPayMethod(g("paymentProvider"));
  const payChanged =
    payState !== order.paymentStatus ||
    depositRate !== order.depositRate ||
    depositAmount !== order.depositAmount;

  await db.$transaction(async (tx) => {
    // 1. Cân đối tồn: trả lại tồn cho item bị xoá / giảm SL, trừ thêm cho item tăng / mới
    const keptIds = new Set(items.map((i) => i.id).filter(Boolean) as string[]);

    for (const old of order.items) {
      if (!old.variantId) continue;
      if (!keptIds.has(old.id)) {
        // bị xoá -> hoàn tồn
        await restock(tx, old.variantId, old.quantity, order.code, "sửa đơn: bỏ SP");
      }
    }
    for (const i of items) {
      if (!i.variantId) continue;
      const old = i.id ? oldById.get(i.id) : undefined;
      const oldQty = old && old.variantId === i.variantId ? old.quantity : 0;
      const delta = i.quantity - oldQty; // >0 trừ thêm, <0 hoàn lại
      if (delta !== 0)
        await restock(tx, i.variantId, -delta, order.code, "sửa đơn: đổi SL");
    }

    // 2. Xoá các item không còn
    const removeIds = order.items
      .filter((it) => !keptIds.has(it.id))
      .map((it) => it.id);
    if (removeIds.length)
      await tx.orderItem.deleteMany({ where: { id: { in: removeIds } } });

    // 3. Cập nhật / tạo item
    for (const i of items) {
      const v = i.variantId ? vmap.get(i.variantId) : undefined;
      const data = {
        variantId: v ? i.variantId : null,
        productName: v?.product.name ?? (i.name || "Sản phẩm"),
        variantName: v?.name ?? oldById.get(i.id ?? "")?.variantName ?? "",
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        tint: v?.product.images[0]?.tint ?? oldById.get(i.id ?? "")?.tint ?? "#EFEBE3",
        imageUrl: i.imageUrl ?? v?.product.images[0]?.url ?? null,
      };
      if (i.id && oldById.has(i.id)) {
        await tx.orderItem.update({ where: { id: i.id }, data });
      } else {
        await tx.orderItem.create({ data: { ...data, orderId } });
      }
    }

    // 4. Cập nhật đơn
    await tx.order.update({
      where: { id: orderId },
      data: {
        customerName: g("customerName") || order.customerName,
        customerPhone: g("customerPhone") || order.customerPhone,
        customerEmail: g("customerEmail") || null,
        province: g("province") || order.province,
        district: g("district") || order.district,
        ward: g("ward") || order.ward,
        addressLine: g("addressLine") || order.addressLine,
        note: g("note") || null,
        shippingCarrier: carrier,
        shippingFee,
        subtotal,
        discount,
        total,
        paymentStatus: payState,
        depositRate,
        depositAmount,
        balanceAmount,
      },
    });

    await reconcilePayment(
      tx,
      orderId,
      payState,
      payState === "PAID" ? total : depositAmount,
      payMethod,
    );

    await tx.orderStatusEvent.create({
      data: {
        orderId,
        status: order.status as never,
        note: payChanged
          ? `Sửa đơn + thanh toán (${PAY_VI[payState]}${
              payState === "UNPAID" ? "" : ` · ${PAY_METHOD_VI[payMethod]}`
            }) bởi ${user.name}`
          : `Sửa đơn bởi ${user.name}`,
        byUserId: user.id,
      },
    });
  });

  revalidatePath("/admin/orders");
  redirect(`/admin/orders?id=${orderId}`);
}

/**
 * Xoá hẳn một đơn hàng (kèm sản phẩm, thanh toán, vận đơn, lịch sử — cascade).
 * Hoàn lại tồn kho cho các dòng có biến thể. Không hoàn tác được.
 */
export async function deleteOrderAction(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.ORDER_WRITE)) {
    return { ok: false, error: "Không có quyền xoá đơn" };
  }
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Không tìm thấy đơn" };

  await db.$transaction(async (tx) => {
    for (const it of order.items) {
      if (it.variantId) {
        await restock(tx, it.variantId, it.quantity, order.code, `xoá đơn bởi ${user.name}`);
      }
    }
    await tx.order.delete({ where: { id: orderId } });
  });
  revalidatePath("/admin/orders");
  return { ok: true };
}

/** Admin xác nhận đã nhận chuyển khoản (đặt cọc hoặc thanh toán đủ). */
export async function confirmBankTransferAction(
  orderId: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.ORDER_WRITE)) {
    return { ok: false, error: "Không có quyền" };
  }
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      payments: { where: { provider: "BANK_TRANSFER", status: "PENDING" }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) return { ok: false, error: "Không tìm thấy đơn" };
  const pay = order.payments[0];
  if (!pay) return { ok: false, error: "Đơn không có khoản chuyển khoản chờ xác nhận" };

  const newPayStatus: "DEPOSIT_PAID" | "PAID" =
    pay.kind === "DEPOSIT" ? "DEPOSIT_PAID" : "PAID";
  const nextStatus: "CONFIRMED" | typeof order.status =
    order.status === "PENDING" ? "CONFIRMED" : order.status;
  await db.$transaction([
    db.payment.update({
      where: { id: pay.id },
      data: { status: "PAID", paidAt: new Date() },
    }),
    db.order.update({
      where: { id: orderId },
      data: { paymentStatus: newPayStatus, status: nextStatus },
    }),
    db.orderStatusEvent.create({
      data: {
        orderId,
        status: nextStatus,
        note: `Xác nhận đã nhận chuyển khoản (${pay.amount.toLocaleString("vi-VN")}₫) — ${user.name}`,
        byUserId: user.id,
      },
    }),
  ]);
  revalidatePath("/admin/orders");
  return { ok: true };
}

/** Đổi ngôn ngữ mặc định hiển thị TÊN sản phẩm ngoài storefront (vi | en). */
export async function setProductNameLangAction(
  lang: "vi" | "en",
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.SETTINGS_WRITE)) {
    return { ok: false, error: "Không có quyền" };
  }
  await setProductNameLang(lang === "en" ? "en" : "vi");
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { ok: true };
}

/** Bật/tắt hiển thị giá + nút mua ngoài storefront (chế độ xem tham khảo). */
export async function setShowPricesAction(
  on: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.SETTINGS_WRITE)) {
    return { ok: false, error: "Không có quyền" };
  }
  await setShowPrices(!!on);
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Lưu ngưỡng tặng mẫu thử + đơn giá tham khảo phí ship Hàn (₫/kg). */
export async function updateShippingPromoAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.SETTINGS_WRITE)) {
    return { ok: false, error: "Không có quyền" };
  }
  const n = (k: string) =>
    Math.max(0, Math.round(Number(formData.get(k)) || 0));
  await setSampleThreshold(n("sampleThreshold") || 500000);
  await setKrShipPerKg(n("krShipPerKg"));
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Lưu thông tin tài khoản nhận chuyển khoản (VietQR). */
export async function updateBankInfoAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireStaff();
  if (!can(user.role.permissions, PERMISSIONS.SETTINGS_WRITE)) {
    return { ok: false, error: "Không có quyền" };
  }
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const info: BankInfo = {
    bankName: g("bankName"),
    bankBin: g("bankBin"),
    account: g("account"),
    holder: g("holder").toUpperCase(),
  };
  if (!info.bankName || !/^\d{6}$/.test(info.bankBin) || !info.account || !info.holder) {
    return { ok: false, error: "Thông tin chưa hợp lệ (mã BIN phải 6 chữ số)" };
  }
  await setBankInfo(info);
  revalidatePath("/admin/settings");
  return { ok: true };
}

/** Điều chỉnh tồn 1 biến thể theo delta (dương = tăng tồn / hoàn hàng). */
async function restock(
  tx: Prisma.TransactionClient,
  variantId: string,
  delta: number,
  code: string,
  reason: string,
) {
  if (delta === 0) return;
  const inv = await tx.inventory.findUnique({ where: { variantId } });
  if (!inv) return;
  await tx.inventory.update({
    where: { variantId },
    data: { quantity: { increment: delta } },
  });
  await tx.stockMovement.create({
    data: {
      variantId,
      delta,
      reason: delta > 0 ? "return" : "sale",
      note: `Đơn ${code} — ${reason}`,
    },
  });
}
