import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getLocale, pick, productName } from "@/lib/i18n";
import { getShowPrices, getProductNameLang } from "@/lib/settings";
import { effectivePrice } from "@/lib/format";
import { ProductGallery } from "@/components/shop/product-gallery";
import { PurchasePanel } from "@/components/shop/purchase-panel";
import { ProductCard } from "@/components/shop/product-card";

async function getProduct(slug: string) {
  return db.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: true,
      images: { orderBy: { order: "asc" } },
      variants: { orderBy: { price: "asc" }, include: { inventory: true } },
      reviews: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await db.product.findUnique({
    where: { slug },
    select: { name: true, description: true, metaTitle: true, metaDescription: true },
  });
  return {
    title: p?.metaTitle || p?.name || "Sản phẩm",
    description: p?.metaDescription || p?.description || undefined,
  };
}

export default async function ProductPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const locale = await getLocale();
  const showPrices = await getShowPrices();
  const nameLang = await getProductNameLang();
  const p = await getProduct(slug);
  if (!p) notFound();
  const pName = productName(locale, nameLang, p);

  const related = await db.product.findMany({
    where: {
      status: "ACTIVE",
      categoryId: p.categoryId,
      id: { not: p.id },
    },
    take: 5,
    select: {
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
    },
  });

  const panelVariants = p.variants.map((v) => {
    const eff = effectivePrice(v);
    return {
      id: v.id,
      name: v.name,
      price: v.price,
      salePrice: v.salePrice,
      effPrice: eff.price,
      effOriginal: eff.original,
      stock: v.inventory?.quantity ?? 0,
    };
  });

  const ratingBuckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    pct:
      p.ratingCount > 0
        ? Math.round(
            (p.reviews.filter((r) => r.rating === star).length /
              Math.max(p.reviews.length, 1)) *
              100,
          )
        : 0,
  }));

  return (
    <div className="mx-auto max-w-[1440px] px-4 md:px-16 pb-16">
      <div className="pt-5 text-[12.5px] text-muted-2">
        <Link href="/products">Trang chủ</Link> /{" "}
        <Link href={`/products?category=${p.category.slug}`}>{p.category.name}</Link>{" "}
        / <span className="text-foreground">{pName}</span>
      </div>

      <div className="grid md:grid-cols-[560px_1fr] gap-14 pt-6">
        <ProductGallery
          images={p.images.map((img) => ({
            id: img.id,
            url: img.url,
            tint: img.tint,
          }))}
          name={pName}
        />

        <div>
          <div className="text-[11.5px] text-muted font-semibold uppercase tracking-wide">
            {p.brand.name}
          </div>
          <h1 className="text-[26px] font-bold leading-snug tracking-tight mt-2 mb-3">
            {pName}
          </h1>
          <div className="flex items-center gap-2.5 text-[13.5px]">
            <span className="text-bloom">★★★★★</span>
            <b>{p.ratingAvg.toFixed(1)}</b>
            <span className="text-muted underline">
              {p.ratingCount} đánh giá
            </span>
            <span className="text-line">|</span>
            <span className="text-muted">Đã bán {p.soldCount}</span>
          </div>

          <PurchasePanel
            variants={panelVariants}
            showPrices={showPrices}
            labels={{
              addToCart: locale === "ko" ? "장바구니 담기" : "Thêm vào giỏ",
              buyNow: locale === "ko" ? "바로 구매" : "Mua ngay",
              sizeLabel: locale === "ko" ? "옵션" : "Phân loại",
              inStock: locale === "ko" ? "재고" : "Còn",
              outOfStock: locale === "ko" ? "품절" : "Hết hàng",
              priceHidden:
                locale === "ko" ? "가격 문의" : "Giá: liên hệ",
              priceHiddenHint:
                locale === "ko"
                  ? "현재 참고용 카탈로그입니다. 가격과 주문은 문의해 주세요."
                  : "Cửa hàng đang mở xem tham khảo. Vui lòng liên hệ để biết giá & đặt hàng.",
            }}
          />

          <div className="border border-line rounded-xl p-4.5 mt-5.5 flex flex-col gap-3 text-[13px] leading-relaxed">
            <InfoRow>
              <b>Order chính hãng từ Olive Young Hàn Quốc</b>. Phí ship Hàn → VN
              tính theo cân nặng (kg) — nhân viên báo sau khi gom &amp; cân đơn.
            </InfoRow>
            <InfoRow>
              <b>Chính hãng 100%</b> — nhập khẩu chính ngạch, có tem phụ tiếng Việt.
            </InfoRow>
            <InfoRow>
              <b>Đổi trả trong 7 ngày</b> nếu sản phẩm còn nguyên seal.
            </InfoRow>
          </div>
        </div>
      </div>

      {/* description + info */}
      <section className="pt-14">
        <div className="flex gap-8 border-b border-line">
          <span className="text-[15px] font-semibold py-4 border-b-2 border-bloom">
            Mô tả
          </span>
          <span className="text-[15px] font-semibold py-4 text-muted-2">
            Thành phần
          </span>
          <span className="text-[15px] font-semibold py-4 text-muted-2">
            Đánh giá ({p.ratingCount})
          </span>
        </div>
        <div className="grid md:grid-cols-[1fr_340px] gap-14 pt-7">
          <div className="text-sm leading-[1.75] text-[#3A3A3A] whitespace-pre-line">
            {pick(locale, p.description, p.descriptionKo) || "Đang cập nhật mô tả."}
            {p.ingredients && (
              <>
                <h3 className="font-bold mt-6 mb-2 text-foreground">Thành phần</h3>
                {p.ingredients}
              </>
            )}
            {p.howToUse && (
              <>
                <h3 className="font-bold mt-6 mb-2 text-foreground">Cách dùng</h3>
                {p.howToUse}
              </>
            )}
          </div>
          <div className="border border-line rounded-xl p-5 h-fit">
            <div className="text-[13px] font-bold mb-3.5">Thông tin nhanh</div>
            <dl className="text-[13px] leading-[2] text-[#4A4A4A]">
              <Spec k="Xuất xứ" v={p.origin ?? "Hàn Quốc"} />
              <Spec k="Thương hiệu" v={p.brand.name} />
              <Spec k="Danh mục" v={p.category.name} />
              <Spec
                k="Hình thức"
                v={p.orderType === "PREORDER" ? "Đặt trước" : "Có sẵn"}
              />
            </dl>
          </div>
        </div>
      </section>

      {/* reviews */}
      <section className="pt-12">
        <h2 className="text-[22px] font-bold tracking-tight mb-5">
          Đánh giá từ khách hàng
        </h2>
        <div className="grid md:grid-cols-[280px_1fr] gap-12">
          <div>
            <div className="flex items-end gap-2.5">
              <span className="text-[44px] font-bold">
                {p.ratingAvg.toFixed(1)}
              </span>
              <span className="text-bloom text-base mb-2">★★★★★</span>
            </div>
            <div className="text-[13px] text-muted mt-1 mb-4">
              {p.ratingCount} đánh giá
            </div>
            <div className="flex flex-col gap-2 text-xs text-muted">
              {ratingBuckets.map((b) => (
                <div key={b.star} className="flex items-center gap-2">
                  {b.star}★
                  <div className="flex-1 h-1.5 bg-[#EEEEE9] rounded-full">
                    <div
                      className="h-1.5 bg-bloom rounded-full"
                      style={{ width: `${b.pct}%` }}
                    />
                  </div>
                  {b.pct}%
                </div>
              ))}
            </div>
          </div>
          <div>
            {p.reviews.length === 0 ? (
              <p className="text-sm text-muted">Chưa có đánh giá.</p>
            ) : (
              p.reviews.map((r) => (
                <div
                  key={r.id}
                  className="border-b border-line pb-5 mb-5 last:border-0"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-[34px] h-[34px] rounded-full bg-surface-2 flex items-center justify-center text-[13px] font-semibold text-bloom">
                      {r.authorName.charAt(0)}
                    </span>
                    <div>
                      <div className="text-[13.5px] font-semibold">
                        {r.authorName}
                      </div>
                      <div className="text-[11.5px] text-muted-2">
                        {r.skinType ? `${r.skinType} · ` : ""}Đã mua hàng
                      </div>
                    </div>
                    <span className="ml-auto text-bloom text-[13px]">
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </span>
                  </div>
                  <p className="text-[13.5px] leading-relaxed text-[#3A3A3A] mt-3">
                    {r.body}
                  </p>
                  <div className="text-xs text-muted-2 mt-2.5">
                    Hữu ích ({r.helpfulCount})
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="pt-14">
          <h2 className="text-[22px] font-bold tracking-tight mb-5">
            Thường được mua cùng
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {related.map((rp) => (
              <ProductCard
                key={rp.slug}
                p={rp}
                locale={locale}
                showPrices={showPrices}
                nameLang={nameLang}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InfoRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1D6FA5"
        strokeWidth="1.5"
        className="shrink-0 mt-0.5"
      >
        <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
      <div>{children}</div>
    </div>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-2">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
