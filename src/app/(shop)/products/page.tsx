import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getLocale } from "@/lib/i18n";
import { getShowPrices, getProductNameLang } from "@/lib/settings";
import { ProductCard } from "@/components/shop/product-card";

const PAGE_SIZE = 16;

const cardSelect = {
  slug: true,
  name: true,
  nameEn: true,
  nameKo: true,
  isNew: true,
  isBestSeller: true,
  orderType: true,
  ratingAvg: true,
  ratingCount: true,
  brand: { select: { name: true } },
  images: { orderBy: { order: "asc" }, take: 1, select: { tint: true, url: true } },
  variants: {
    orderBy: { price: "asc" },
    take: 1,
    select: { price: true, salePrice: true, saleStartsAt: true, saleEndsAt: true },
  },
} satisfies Prisma.ProductSelect;

type SP = Record<string, string | string[] | undefined>;

export default async function ProductsPage(props: { searchParams: Promise<SP> }) {
  const sp = await props.searchParams;
  const locale = await getLocale();
  const showPrices = await getShowPrices();
  const nameLang = await getProductNameLang();

  const category = typeof sp.category === "string" ? sp.category : undefined;
  const brandSlug = typeof sp.brand === "string" ? sp.brand : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const tag = sp.tag === "best" || sp.tag === "new" ? sp.tag : undefined;
  const sort = typeof sp.sort === "string" ? sp.sort : tag === "new" ? "new" : "best";
  const onSale = sp.onSale === "1";
  const page = Math.max(1, Number(sp.page) || 1);

  // Cây danh mục cho sidebar
  const allCats = await db.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  const topCats = allCats.filter((c) => !c.parentId);
  const childrenOf = (id: string) => allCats.filter((c) => c.parentId === id);

  const catWhere = (slug: string): Prisma.ProductWhereInput => ({
    OR: [{ category: { slug } }, { category: { parent: { slug } } }],
  });

  const baseWhere: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    ...(category ? catWhere(category) : {}),
    ...(brandSlug ? { brand: { slug: brandSlug } } : {}),
    ...(q
      ? {
          AND: [
            {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { nameKo: { contains: q, mode: "insensitive" } },
                { brand: { name: { contains: q, mode: "insensitive" } } },
              ],
            },
          ],
        }
      : {}),
    ...(onSale ? { variants: { some: { salePrice: { not: null } } } } : {}),
    ...(tag === "best" ? { isBestSeller: true } : {}),
    ...(tag === "new" ? { isNew: true } : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "new"
      ? { createdAt: "desc" }
      : sort === "rating"
        ? { ratingAvg: "desc" }
        : { soldCount: "desc" };

  const brands = await db.brand.findMany({
    where: { products: { some: { status: "ACTIVE" } } },
    orderBy: [{ products: { _count: "desc" } }, { name: "asc" }],
  });
  const currentCat = category
    ? allCats.find((c) => c.slug === category)
    : undefined;

  // ------- Chế độ hiển thị -------
  const sidebar = (
    <aside className="hidden md:block">
      <FilterGroup title="Danh mục">
        <CatLink
          href={brandSlug ? `/products?brand=${brandSlug}` : "/products"}
          label="Tất cả sản phẩm"
          active={!category}
        />
        {topCats.map((top) => {
          const kids = childrenOf(top.id);
          const activeTop = category === top.slug;
          const activeChild = kids.some((k) => k.slug === category);
          const bq = brandSlug ? `&brand=${brandSlug}` : "";
          return (
            <div key={top.id} className="mb-0.5">
              <CatLink
                href={`/products?category=${top.slug}${bq}`}
                label={top.name}
                active={activeTop}
                bold
              />
              {(activeTop || activeChild) &&
                kids.map((k) => (
                  <CatLink
                    key={k.id}
                    href={`/products?category=${k.slug}${bq}`}
                    label={k.name}
                    active={category === k.slug}
                    indent
                  />
                ))}
            </div>
          );
        })}
      </FilterGroup>

      <FilterGroup title="Thương hiệu">
        <CatLink
          href={category ? `/products?category=${category}` : "/products"}
          label="Tất cả thương hiệu"
          active={!brandSlug}
        />
        <div className="max-h-[340px] overflow-y-auto -mr-1 pr-1">
          {brands.map((b) => {
            const on = brandSlug === b.slug;
            // Bấm thương hiệu -> hiện HẾT sản phẩm của brand đó (bỏ tag/onSale/q/sort),
            // chỉ giữ danh mục đang chọn nếu có.
            const href = on
              ? category
                ? `/products?category=${category}`
                : "/products"
              : `/products?brand=${b.slug}${category ? `&category=${category}` : ""}`;
            return (
              <CatLink key={b.id} href={href} label={b.name} active={on} check />
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup title="Ưu đãi">
        <CatLink
          href={(() => {
            const p = new URLSearchParams();
            if (category) p.set("category", category);
            if (brandSlug) p.set("brand", brandSlug);
            if (!onSale) p.set("onSale", "1");
            const s = p.toString();
            return s ? `/products?${s}` : "/products";
          })()}
          label="Đang giảm giá"
          active={onSale}
          check
        />
      </FilterGroup>
    </aside>
  );

  // Lưới phẳng + phân trang (mặc định: tất cả sản phẩm)
  const [products, total] = await Promise.all([
    db.product.findMany({
      where: baseWhere,
      select: cardSelect,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where: baseWhere }),
  ]);
  const pages = Math.ceil(total / PAGE_SIZE);

  const brandName = brandSlug
    ? brands.find((b) => b.slug === brandSlug)?.name
    : undefined;
  const title =
    currentCat?.name ??
    (q
      ? `Kết quả cho “${q}”`
      : tag === "best"
        ? "Bán chạy"
        : tag === "new"
          ? "Hàng mới về"
          : onSale
            ? "Đang giảm giá"
            : brandName ?? "Tất cả sản phẩm");
  const siblings = currentCat?.parentId
    ? childrenOf(currentCat.parentId)
    : currentCat
      ? childrenOf(currentCat.id)
      : [];

  return (
    <div className="mx-auto max-w-[1440px] px-4 md:px-16">
      <div className="pt-6 text-[12.5px] text-muted-2">
        <Link href="/">Trang chủ</Link> /{" "}
        {title !== "Tất cả sản phẩm" && (
          <>
            <Link href="/products">Tất cả sản phẩm</Link> /{" "}
          </>
        )}
        <span className="text-foreground">{title}</span>
      </div>
      <h1 className="text-[28px] font-bold tracking-tight mt-3">{title}</h1>

      {siblings.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {currentCat?.parentId && (
            <Link
              href={`/products?category=${allCats.find((c) => c.id === currentCat.parentId)?.slug}${brandSlug ? `&brand=${brandSlug}` : ""}`}
              className="px-3 py-1.5 rounded-full border border-line text-[12.5px] text-muted"
            >
              ← Tất cả
            </Link>
          )}
          {siblings.map((s) => (
            <Link
              key={s.id}
              href={`/products?category=${s.slug}${brandSlug ? `&brand=${brandSlug}` : ""}`}
              className={`px-3 py-1.5 rounded-full text-[12.5px] border ${
                category === s.slug
                  ? "bg-bloom text-white hover:bg-bloom-ink border-bloom"
                  : "border-line text-[#555]"
              }`}
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <span className="text-[13.5px] text-muted">{total} sản phẩm</span>
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-muted">Sắp xếp</span>
          {[
            ["best", "Bán chạy"],
            ["new", "Mới nhất"],
            ["rating", "Đánh giá"],
          ].map(([s, label]) => (
            <Link
              key={s}
              href={hrefWith(sp, { sort: s, page: undefined })}
              className={`px-3 py-1.5 rounded-md border ${
                sort === s
                  ? "border-bloom bg-bloom text-white hover:bg-bloom-ink"
                  : "border-line"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-[260px_minmax(0,1fr)] gap-10 pt-6 pb-14">
        {sidebar}
        <div className="min-w-0">
          {products.length === 0 ? (
            <p className="text-muted text-sm py-16 text-center">
              Không tìm thấy sản phẩm phù hợp.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {products.map((p) => (
                <ProductCard
                  key={p.slug}
                  p={p}
                  locale={locale}
                  showPrices={showPrices}
                  nameLang={nameLang}
                />
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav className="flex justify-center items-center gap-1.5 mt-12">
              <PagerArrow
                dir="prev"
                href={hrefWith(sp, { page: String(page - 1) })}
                disabled={page <= 1}
              />
              {pageWindow(page, pages).map((it, i) =>
                it === "…" ? (
                  <span
                    key={`gap-${i}`}
                    className="w-[38px] h-[38px] flex items-center justify-center text-[13px] text-muted-2"
                  >
                    …
                  </span>
                ) : (
                  <Link
                    key={it}
                    href={hrefWith(sp, { page: String(it) })}
                    aria-current={it === page ? "page" : undefined}
                    className={`w-[38px] h-[38px] rounded-lg flex items-center justify-center text-[13px] ${
                      it === page
                        ? "bg-bloom text-white hover:bg-bloom-ink"
                        : "border border-line hover:border-bloom"
                    }`}
                  >
                    {it}
                  </Link>
                ),
              )}
              <PagerArrow
                dir="next"
                href={hrefWith(sp, { page: String(page + 1) })}
                disabled={page >= pages}
              />
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

/** Danh sách trang hiển thị: 1 … (cur-1) cur (cur+1) … last */
function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}

function PagerArrow({
  dir,
  href,
  disabled,
}: {
  dir: "prev" | "next";
  href: string;
  disabled: boolean;
}) {
  const cls =
    "w-[38px] h-[38px] rounded-lg border border-line flex items-center justify-center";
  const icon = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={dir === "next" ? "" : "rotate-180"}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
  if (disabled)
    return (
      <span className={`${cls} text-muted-2 opacity-40`} aria-hidden="true">
        {icon}
      </span>
    );
  return (
    <Link
      href={href}
      aria-label={dir === "next" ? "Trang sau" : "Trang trước"}
      className={`${cls} text-foreground hover:border-bloom`}
    >
      {icon}
    </Link>
  );
}

function hrefWith(sp: SP, patch: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") p.set(k, v);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) p.delete(k);
    else p.set(k, v);
  }
  const s = p.toString();
  return s ? `/products?${s}` : "/products";
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-line py-5 first:pt-0">
      <h4 className="text-sm font-bold mb-3">{title}</h4>
      {children}
    </div>
  );
}

function CatLink({
  href,
  label,
  active,
  bold,
  indent,
  check,
}: {
  href: string;
  label: string;
  active?: boolean;
  bold?: boolean;
  indent?: boolean;
  check?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 text-[13.5px] py-1.5 transition-colors hover:text-bloom ${
        indent ? "pl-4" : ""
      } ${active ? "text-bloom font-semibold" : bold ? "text-foreground font-medium" : "text-[#3A3A3A]"}`}
    >
      {check && (
        <span
          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
            active ? "bg-bloom border-bloom" : "border-[#C6C6C0]"
          }`}
        >
          {active && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>
      )}
      {label}
    </Link>
  );
}
