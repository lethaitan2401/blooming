import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { guardAdmin } from "@/lib/admin-guard";
import { ADMIN_ACCESS, PERMISSIONS, can } from "@/lib/rbac";
import { getKrwRate } from "@/lib/settings";
import { getLocale, pick } from "@/lib/i18n";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Thêm sản phẩm" };

export default async function NewProductPage(props: {
  searchParams: Promise<{ brand?: string; category?: string }>;
}) {
  const actor = await guardAdmin(ADMIN_ACCESS["/admin/products"]);
  if (!can(actor.role.permissions, PERMISSIONS.PRODUCT_WRITE)) {
    redirect("/admin/forbidden");
  }
  const sp = await props.searchParams;
  const canCost = can(actor.role.permissions, PERMISSIONS.COST_VIEW);
  const locale = await getLocale();

  const [brands, categories, krwRate] = await Promise.all([
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, slug: true, name: true } }),
    db.category.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true, nameKo: true, parentId: true },
    }),
    canCost ? getKrwRate() : Promise.resolve(18),
  ]);

  const presetBrandId = sp.brand
    ? brands.find((b) => b.slug === sp.brand)?.id
    : undefined;
  const presetCategoryId = sp.category
    ? categories.find((c) => c.slug === sp.category)?.id
    : undefined;

  return (
    <div className="p-6 md:p-7">
      <ProductForm
        mode="create"
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        categories={categories.map((c) => ({ id: c.id, name: pick(locale, c.name, c.nameKo), parentId: c.parentId }))}
        canApprove={can(actor.role.permissions, PERMISSIONS.PRICE_APPROVE)}
        canCost={canCost}
        krwRate={krwRate}
        presetBrandId={presetBrandId}
        presetCategoryId={presetCategoryId}
      />
    </div>
  );
}
