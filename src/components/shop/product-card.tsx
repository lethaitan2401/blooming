import Link from "next/link";
import { ProductImageBox } from "./product-image-box";
import { StarRating } from "./star-rating";
import { formatVND, effectivePrice, discountPercent } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { productName } from "@/lib/i18n";

export type ProductCardData = {
  slug: string;
  name: string;
  nameEn: string | null;
  nameKo: string | null;
  isNew: boolean;
  isBestSeller: boolean;
  orderType: "INSTOCK" | "PREORDER";
  ratingAvg: number;
  ratingCount: number;
  brand: { name: string };
  images: { tint: string; url: string | null }[];
  variants: {
    price: number;
    salePrice: number | null;
    saleStartsAt: Date | null;
    saleEndsAt: Date | null;
  }[];
};

export function ProductCard({
  p,
  locale,
  showPrices = true,
  nameLang = "vi",
}: {
  p: ProductCardData;
  locale: Locale;
  showPrices?: boolean;
  nameLang?: "vi" | "en";
}) {
  const displayName = productName(locale, nameLang, p);
  const v = p.variants[0];
  const eff = v
    ? effectivePrice(v)
    : { price: 0, original: null, onSale: false };
  const img = p.images[0];
  const onSale = showPrices && eff.onSale;

  return (
    <Link href={`/product/${p.slug}`} className="flex flex-col gap-2 group">
      <div className="relative w-full aspect-square rounded-[10px] overflow-hidden">
        <ProductImageBox
          url={img?.url}
          tint={img?.tint ?? "#EFEBE3"}
          alt={displayName}
          className="w-full h-full"
          sizes="(max-width: 768px) 45vw, 260px"
        />
        {onSale && eff.original ? (
          <span className="absolute top-2.5 left-2.5 bg-sale text-white text-[11px] font-semibold px-2 py-0.5 rounded">
            -{discountPercent(eff.original, eff.price)}%
          </span>
        ) : p.isNew ? (
          <span className="absolute top-2.5 left-2.5 bg-bloom text-white text-[11px] font-semibold px-2 py-0.5 rounded">
            {locale === "ko" ? "신상" : "Mới"}
          </span>
        ) : p.isBestSeller ? (
          <span className="absolute top-2.5 left-2.5 bg-white/95 text-bloom border border-bloom/30 text-[11px] font-semibold px-2 py-0.5 rounded">
            Best
          </span>
        ) : null}
        {p.orderType === "PREORDER" && (
          <span className="absolute bottom-2.5 left-2.5 bg-white/90 text-foreground text-[10px] font-semibold px-2 py-0.5 rounded">
            {locale === "ko" ? "예약주문" : "Đặt trước"}
          </span>
        )}
      </div>
      <div className="text-[11.5px] text-muted font-semibold uppercase tracking-wide">
        {p.brand.name}
      </div>
      <div className="text-sm font-medium leading-snug h-[38px] overflow-hidden group-hover:text-bloom transition-colors">
        {displayName}
      </div>
      {p.ratingCount > 0 && (
        <StarRating value={p.ratingAvg} count={p.ratingCount} />
      )}
      <div className="flex items-baseline gap-2">
        {!showPrices ? (
          <span className="text-muted font-semibold text-[13px]">
            {locale === "ko" ? "가격 문의" : "Giá: liên hệ"}
          </span>
        ) : onSale ? (
          <>
            <span className="text-sale font-bold text-[15px]">
              {formatVND(eff.price)}
            </span>
            <span className="text-muted-2 text-[12.5px] line-through">
              {formatVND(eff.original!)}
            </span>
          </>
        ) : (
          <span className="text-foreground font-bold text-[15px]">
            {formatVND(eff.price)}
          </span>
        )}
      </div>
    </Link>
  );
}
