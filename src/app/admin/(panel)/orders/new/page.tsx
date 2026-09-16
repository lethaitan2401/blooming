import Link from "next/link";
import { db } from "@/lib/db";
import { guardAdmin } from "@/lib/admin-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { effectivePrice } from "@/lib/format";
import { ManualOrderForm } from "@/components/admin/manual-order-form";
import { adminT } from "@/lib/admin-i18n";
import { getLocale } from "@/lib/i18n";

export const metadata = { title: "Blooming Admin" };

export default async function NewOrderPage() {
  await guardAdmin({ anyOf: [PERMISSIONS.ORDER_WRITE] });
  const t = adminT(await getLocale());

  const products = await db.product.findMany({
    where: { status: { not: "HIDDEN" } },
    orderBy: { name: "asc" },
    include: {
      brand: { select: { name: true } },
      images: { orderBy: { order: "asc" }, take: 1 },
      variants: { orderBy: { price: "asc" }, include: { inventory: true } },
    },
  });

  const list = products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand.name,
    image: p.images[0]?.url ?? null,
    tint: p.images[0]?.tint ?? "#EFEBE3",
    variants: p.variants.map((v) => {
      const eff = effectivePrice(v);
      return {
        id: v.id,
        name: v.name,
        price: v.price,
        salePrice: eff.onSale ? eff.price : null,
        stock: v.inventory?.quantity ?? 0,
      };
    }),
  }));

  return (
    <div className="p-6 md:p-7">
      <div className="text-[12px] text-muted-2 mb-1">
        <Link href="/admin/orders">{t("orders.title")}</Link> /{" "}
        <span className="text-foreground">{t("orders.new")}</span>
      </div>
      <h1 className="text-[22px] font-bold tracking-tight mb-1">
        {t("orders.createManual")}
      </h1>
      <p className="text-[13px] text-muted mb-5">
        {t("orders.createManualHint")}
      </p>

      <ManualOrderForm products={list} />
    </div>
  );
}
