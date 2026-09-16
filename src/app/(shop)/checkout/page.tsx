import { redirect } from "next/navigation";
import { getCart } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLocale, productName } from "@/lib/i18n";
import { effectivePrice } from "@/lib/format";
import { getSampleThreshold, getProductNameLang } from "@/lib/settings";
import { CheckoutForm } from "@/components/shop/checkout-form";

export const metadata = { title: "Thanh toán" };

export default async function CheckoutPage() {
  const cart = await getCart();
  const locale = await getLocale();
  const nameLang = await getProductNameLang();
  if (!cart || cart.items.length === 0) redirect("/cart");

  const user = await getCurrentUser();
  const addr = user
    ? await db.address.findFirst({
        where: { userId: user.id },
        orderBy: { isDefault: "desc" },
      })
    : null;
  const defaults = {
    customerName: addr?.fullName ?? user?.name ?? "",
    customerPhone: addr?.phone ?? user?.phone ?? "",
    customerEmail: user?.email ?? "",
    province: addr?.province ?? "Bến Tre",
    district: addr?.district ?? "",
    ward: addr?.ward ?? "",
    addressLine: addr?.line1 ?? "",
  };

  const lines = cart.items.map((it) => {
    const eff = effectivePrice(it.variant);
    return {
      id: it.id,
      name: productName(locale, nameLang, it.variant.product),
      variantName: it.variant.name,
      tint: it.variant.product.images[0]?.tint ?? "#EFEBE3",
      unit: eff.price,
      qty: it.quantity,
      lineTotal: eff.price * it.quantity,
      preorder: it.variant.product.orderType === "PREORDER",
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const hasPreorder = lines.some((l) => l.preorder);
  const sampleThreshold = await getSampleThreshold();

  return (
    <div className="bg-[#FAFAF8] min-h-screen">
      <div className="mx-auto max-w-[1440px] px-4 md:px-16 py-8">
        <h1 className="text-xl font-bold mb-6">Thanh toán</h1>
        {!user && (
          <p className="text-[13px] text-muted -mt-3 mb-4">
            Đã có tài khoản?{" "}
            <a href="/login?next=/checkout" className="text-bloom font-semibold">
              Đăng nhập
            </a>{" "}
            để dùng địa chỉ đã lưu.
          </p>
        )}
        <CheckoutForm
          lines={lines}
          subtotal={subtotal}
          hasPreorder={hasPreorder}
          defaults={defaults}
          sampleThreshold={sampleThreshold}
        />
      </div>
    </div>
  );
}
