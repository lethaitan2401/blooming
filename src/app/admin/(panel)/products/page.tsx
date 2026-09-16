import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { guardAdmin } from "@/lib/admin-guard";
import { ADMIN_ACCESS, PERMISSIONS, can } from "@/lib/rbac";
import { getKrwRate } from "@/lib/settings";
import { getLocale, pick } from "@/lib/i18n";
import { adminT } from "@/lib/admin-i18n";
import { ProductTable, type Row } from "@/components/admin/product-table";
import { AdminProductFilters } from "@/components/admin/product-filters";

export const metadata = { title: "Sản phẩm" };

export default async function AdminProductsPage(props: {
  searchParams: Promise<{ category?: string; brand?: string; q?: string }>;
}) {
  const actor = await guardAdmin(ADMIN_ACCESS["/admin/products"]);
  const canViewCost = can(actor.role.permissions, PERMISSIONS.COST_VIEW);
  const krwRate = canViewCost ? await getKrwRate() : 18;
  const locale = await getLocale();
  const t = adminT(locale);
  const sp = await props.searchParams;

  const where: Prisma.ProductWhereInput = {
    ...(sp.category
      ? {
          OR: [
            { category: { slug: sp.category } },
            { category: { parent: { slug: sp.category } } },
          ],
        }
      : {}),
    ...(sp.brand ? { brand: { slug: sp.brand } } : {}),
    ...(sp.q
      ? {
          OR: [
            { name: { contains: sp.q, mode: "insensitive" } },
            { variants: { some: { sku: { contains: sp.q, mode: "insensitive" } } } },
            { brand: { name: { contains: sp.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [products, categories, brands, count, hidden, oos] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: [
        { category: { order: "asc" } },
        { category: { name: "asc" } },
        { name: "asc" },
      ],
      include: {
        brand: true,
        category: true,
        variants: {
          orderBy: { price: "asc" },
          include: {
            inventory: true,
            priceRequests: { where: { status: "PENDING" }, select: { id: true } },
          },
        },
      },
    }),
    db.category.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
    db.product.count(),
    db.product.count({ where: { status: "HIDDEN" } }),
    db.inventory.count({ where: { quantity: 0 } }),
  ]);

  const exportQ = new URLSearchParams();
  if (sp.category) exportQ.set("category", sp.category);
  if (sp.brand) exportQ.set("brand", sp.brand);
  if (sp.q) exportQ.set("q", sp.q);
  const exportQuery = exportQ.toString() ? `?${exportQ}` : "";

  const rows: Row[] = products.flatMap((p) =>
    p.variants.map((v) => ({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      nameEn: p.nameEn,
      brand: p.brand.name,
      category: pick(locale, p.category.name, p.category.nameKo),
      categorySlug: p.category.slug,
      sku: v.sku,
      variantId: v.id,
      variantName: v.name,
      costKrw: v.costKrw,
      cost: v.costPrice,
      markupPct: v.markupPct,
      price: v.price,
      salePrice: v.salePrice,
      stock: v.inventory?.quantity ?? 0,
      status: p.status,
      isBestSeller: p.isBestSeller,
      isNew: p.isNew,
      pendingPrice: v.priceRequests.length > 0,
    })),
  );

  return (
    <div className="p-6 md:p-7">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">{t("products.title")}</h1>
          <p className="text-[13px] text-muted mt-1">
            {t("products.summaryLine")
              .replace("%s", String(count))
              .replace("%s", String(hidden))
              .replace("%s", String(oos))}
            {(sp.category || sp.brand || sp.q) &&
              t("products.viewingCount").replace("%s", String(products.length))}
          </p>
        </div>
        <div className="flex gap-2.5">
          <a
            href={`/api/admin/products/export${exportQuery}`}
            className="h-9 px-3.5 bg-white border border-line rounded-lg text-[13px] font-medium flex items-center"
          >
            {t("common.exportExcel")}
          </a>
          <Link
            href={{
              pathname: "/admin/products/new",
              query: {
                ...(sp.brand ? { brand: sp.brand } : {}),
                ...(sp.category ? { category: sp.category } : {}),
              },
            }}
            className="h-9 px-4 bg-bloom text-white hover:bg-bloom-ink rounded-lg text-[13px] font-semibold flex items-center"
          >
            + {t("products.add")}
            {sp.brand
              ? t("products.addToBrand").replace(
                  "%s",
                  brands.find((b) => b.slug === sp.brand)?.name ?? sp.brand,
                )
              : ""}
          </Link>
        </div>
      </div>

      <AdminProductFilters
        categories={categories.map((c) => ({ slug: c.slug, name: pick(locale, c.name, c.nameKo) }))}
        brands={brands.map((b) => ({ slug: b.slug, name: b.name }))}
        current={{ category: sp.category, brand: sp.brand, q: sp.q }}
      />

      <p className="text-[12.5px] text-muted mb-3">
        {t("products.tableHelp").replace(
          "%s",
          canViewCost ? t("products.tableHelpCostSuffix") : "",
        )}
        {canViewCost && t("products.tableHelpCostNote")}
      </p>

      {rows.length === 0 ? (
        <div className="bg-white border border-line rounded-card p-10 text-center text-sm text-muted">
          Không có sản phẩm khớp bộ lọc.
        </div>
      ) : (
        <ProductTable
          rows={rows}
          categories={categories.map((c) => ({ slug: c.slug, name: pick(locale, c.name, c.nameKo) }))}
          canViewCost={canViewCost}
          krwRate={krwRate}
        />
      )}
    </div>
  );
}
