import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { guardAdmin } from "@/lib/admin-guard";
import { ADMIN_ACCESS, PERMISSIONS, can } from "@/lib/rbac";
import { getKrwRate } from "@/lib/settings";
import { getLocale, pick } from "@/lib/i18n";
import { formatVND, formatDateTime } from "@/lib/format";
import { ProductForm, type FormProduct } from "@/components/admin/product-form";

export const metadata = { title: "Sửa sản phẩm" };

export default async function EditProductPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; saved?: string; pr?: string }>;
}) {
  const actor = await guardAdmin(ADMIN_ACCESS["/admin/products"]);
  if (!can(actor.role.permissions, PERMISSIONS.PRODUCT_WRITE)) {
    const { redirect } = await import("next/navigation");
    redirect("/admin/forbidden");
  }
  const { id } = await props.params;
  const sp = await props.searchParams;
  const canCost = can(actor.role.permissions, PERMISSIONS.COST_VIEW);
  const locale = await getLocale();

  const product = await db.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      variants: {
        orderBy: { price: "asc" },
        include: {
          inventory: true,
          priceRequests: { where: { status: "PENDING" }, select: { id: true } },
          orderItems: { select: { id: true }, take: 1 },
        },
      },
    },
  });
  if (!product) notFound();

  const [brands, categories, krwRate, history] = await Promise.all([
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.category.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, nameKo: true, parentId: true },
    }),
    canCost ? getKrwRate() : Promise.resolve(18),
    db.priceHistory.findMany({
      where: { variant: { productId: id } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const userIds = [...new Set(history.map((h) => h.changedBy))];
  const users = userIds.length
    ? await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      })
    : [];
  const uname = new Map(users.map((u) => [u.id, u.name]));

  const fp: FormProduct = {
    id: product.id,
    name: product.name,
    nameEn: product.nameEn ?? "",
    nameKo: product.nameKo ?? "",
    slug: product.slug,
    description: product.description ?? "",
    ingredients: product.ingredients ?? "",
    howToUse: product.howToUse ?? "",
    origin: product.origin ?? "Hàn Quốc",
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
    orderType: product.orderType,
    status: product.status,
    isBestSeller: product.isBestSeller,
    isNew: product.isNew,
    brandId: product.brandId,
    categoryId: product.categoryId,
    images: product.images.map((im) => ({ url: im.url ?? "", tint: im.tint })),
    variants: product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      costKrw: v.costKrw,
      price: v.price,
      salePrice: v.salePrice,
      stock: v.inventory?.quantity ?? 0,
      locked: v.orderItems.length > 0,
      pendingPrice: v.priceRequests.length > 0,
    })),
  };

  const priceHistory = history.map((h) => {
    const tag = h.field === "SALE_PRICE" ? " (KM)" : "";
    const label =
      h.oldValue == null
        ? `Giá gốc ${h.newValue != null ? formatVND(h.newValue) : "—"}${tag}`
        : `${formatVND(h.oldValue)} → ${
            h.newValue != null ? formatVND(h.newValue) : "bỏ"
          }${tag}`;
    return {
      label,
      by: uname.get(h.changedBy) ?? "Nhân viên",
      at: formatDateTime(h.createdAt),
    };
  });

  return (
    <div className="p-6 md:p-7">
      {(sp.created || sp.saved) && (
        <div className="mb-4 bg-[#E7F1FA] border border-[#CFE3F3] text-success text-[13px] px-4 py-2.5 rounded-lg">
          {sp.created
            ? "Đã tạo sản phẩm."
            : sp.pr
              ? `Đã lưu. ${sp.pr} thay đổi giá đã gửi chờ Quản lý duyệt.`
              : "Đã lưu thay đổi."}
        </div>
      )}
      <ProductForm
        mode="edit"
        product={fp}
        brands={brands}
        categories={categories.map((c) => ({ id: c.id, name: pick(locale, c.name, c.nameKo), parentId: c.parentId }))}
        canApprove={can(actor.role.permissions, PERMISSIONS.PRICE_APPROVE)}
        canCost={canCost}
        krwRate={krwRate}
        priceHistory={priceHistory}
      />
    </div>
  );
}
