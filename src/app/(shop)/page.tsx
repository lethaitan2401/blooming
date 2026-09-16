import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { getDictionary, getLocale } from "@/lib/i18n";
import { getShowPrices, getProductNameLang } from "@/lib/settings";
import { ProductCard, type ProductCardData } from "@/components/shop/product-card";
import heroBanner from "../../../public/brand/hero-banner.png";

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
    select: {
      price: true,
      salePrice: true,
      saleStartsAt: true,
      saleEndsAt: true,
    },
  },
} as const;

export default async function HomePage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const showPrices = await getShowPrices();
  const nameLang = await getProductNameLang();

  const [best, fresh, brands] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE", isBestSeller: true },
      select: cardSelect,
      take: 5,
      orderBy: { soldCount: "desc" },
    }),
    db.product.findMany({
      where: { status: "ACTIVE", isNew: true },
      select: cardSelect,
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    db.brand.findMany({
      where: { products: { some: { status: "ACTIVE" } } },
      orderBy: { products: { _count: "desc" } },
      include: { _count: { select: { products: true } } },
      take: 8,
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 md:px-16">
      {/* hero */}
      <section className="py-7">
        <Link href="/products" className="block rounded-2xl overflow-hidden">
          <Image
            src={heroBanner}
            alt="Blooming — Mỹ phẩm chính hãng"
            priority
            sizes="(max-width: 1440px) 100vw, 1440px"
            className="w-full h-auto"
          />
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <Link
            href="/products"
            className="inline-flex items-center justify-center h-[52px] px-8 bg-bloom text-white hover:bg-bloom-ink font-semibold text-[15px] rounded-lg"
          >
            {t("home.heroCta")}
          </Link>
          <Link
            href="/products?onSale=1"
            className="inline-flex items-center justify-center h-[52px] px-6 border border-bloom font-semibold text-sm rounded-lg"
          >
            {locale === "ko" ? "세일 상품 보기" : "Xem ưu đãi"}
          </Link>
          <span className="text-[13.5px] text-muted ml-1">
            {locale === "ko"
              ? "정품 100% · 전국 배송 · 샘플 증정"
              : "Chính hãng 100% · Giao toàn tỉnh · Tặng mẫu thử"}
          </span>
        </div>
      </section>

      <Rail
        title={t("home.bestTitle")}
        sub={t("home.bestSub")}
        viewAll={t("home.viewAll")}
        href="/products?tag=best"
        items={best}
        locale={locale}
        showPrices={showPrices}
        nameLang={nameLang}
      />
      <Rail
        title={t("home.newTitle")}
        viewAll={t("home.viewAll")}
        href="/products?tag=new"
        items={fresh}
        locale={locale}
        showPrices={showPrices}
        nameLang={nameLang}
      />

      {/* brands */}
      <section className="pt-14">
        <div className="flex items-end justify-between mb-5">
          <h2 className="text-[25px] font-bold tracking-tight">
            {locale === "ko" ? "주요 브랜드" : "Thương hiệu nổi bật"}
          </h2>
          <Link href="/brands" className="text-sm text-muted">
            {t("home.viewAll")} →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {brands.map((b) => (
            <Link
              key={b.id}
              href={`/products?brand=${b.slug}`}
              className="h-[88px] border border-line rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-[15px] text-[#333] hover:border-bloom transition-colors"
            >
              {b.logoText ?? b.name}
              <span className="text-[11px] font-medium text-muted-2">
                {b._count.products} sản phẩm
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* promo band */}
      <section className="pt-14">
        <div className="bg-bloom rounded-2xl px-8 md:px-14 py-11 flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-white">
          <div>
            <div className="text-[13px] font-semibold opacity-80 tracking-widest uppercase">
              {locale === "ko" ? "신규 회원" : "Thành viên mới"}
            </div>
            <div className="text-[26px] font-bold mt-2">
              {locale === "ko"
                ? "첫 주문 샘플 증정"
                : "Tặng mẫu thử cho đơn đầu tiên"}
            </div>
            <p className="mt-2 text-sm opacity-85">
              {locale === "ko"
                ? "회원가입 후 첫 주문 시 인기 제품 샘플을 함께 보내드려요."
                : "Đăng ký thành viên — đơn đầu tiên được tặng kèm mẫu thử sản phẩm hot."}
            </p>
          </div>
          <Link
            href="/account"
            className="h-[52px] px-8 bg-white text-foreground font-bold text-[15px] rounded-lg inline-flex items-center justify-center"
          >
            {locale === "ko" ? "가입하기" : "Đăng ký ngay"}
          </Link>
        </div>
      </section>
    </div>
  );
}

function Rail({
  title,
  sub,
  viewAll,
  href,
  items,
  locale,
  showPrices,
  nameLang,
}: {
  title: string;
  sub?: string;
  viewAll: string;
  href: string;
  items: ProductCardData[];
  locale: "vi" | "ko";
  showPrices: boolean;
  nameLang: "vi" | "en";
}) {
  if (items.length === 0) return null;
  return (
    <section className="pt-10">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-[25px] font-bold tracking-tight">{title}</h2>
          {sub && <p className="mt-1.5 text-[13.5px] text-muted">{sub}</p>}
        </div>
        <Link href={href} className="text-sm text-muted">
          {viewAll} →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {items.map((p) => (
          <ProductCard
            key={p.slug}
            p={p}
            locale={locale}
            showPrices={showPrices}
            nameLang={nameLang}
          />
        ))}
      </div>
    </section>
  );
}
