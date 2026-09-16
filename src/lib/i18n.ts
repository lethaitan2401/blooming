import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "./constants";

export type Locale = "vi" | "ko";
export const LOCALES: Locale[] = ["vi", "ko"];
export { LOCALE_COOKIE };

/**
 * i18n tối giản cho bản đầu — đủ để bật/tắt VI ⇄ KO cho phần giao diện.
 * Nâng cấp: chuyển sang `next-intl` + Tolgee/DeepL (xem plan).
 */
const dict = {
  vi: {
    "nav.best": "Bán chạy",
    "nav.new": "Hàng mới",
    "nav.skincare": "Skincare",
    "nav.makeup": "Trang điểm",
    "nav.mask": "Mặt nạ",
    "nav.suncare": "Chống nắng",
    "nav.lip": "Son môi",
    "nav.supplement": "Thực phẩm chức năng",
    "nav.fragrance": "Nước hoa",
    "nav.brands": "Thương hiệu",
    "nav.sale": "Khuyến mãi",
    "header.searchPlaceholder": "Tìm sản phẩm, thương hiệu…",
    "header.account": "Tài khoản",
    "header.wishlist": "Yêu thích",
    "header.cart": "Giỏ hàng",
    "header.language": "Ngôn ngữ",
    "header.freeship": "Order chính hãng từ Hàn Quốc · Ship về VN tính theo kg · Tặng mẫu thử cho đơn lớn",
    "home.bestTitle": "Bán chạy tuần này",
    "home.bestSub": "Cập nhật theo lượt mua 7 ngày gần nhất",
    "home.newTitle": "Hàng mới về",
    "home.viewAll": "Xem tất cả",
    "home.heroKicker": "Glow Week",
    "home.heroTitle": "Rạng rỡ tự nhiên, chăm da mỗi ngày",
    "home.heroSub":
      "Giảm đến 40% các dòng dưỡng ẩm & chống nắng bán chạy. Hàng order chính hãng từ Hàn Quốc, ship về VN tính theo kg.",
    "home.heroCta": "Mua ngay",
    "common.addToCart": "Thêm vào giỏ",
    "common.buyNow": "Mua ngay",
    "common.sold": "Đã bán",
    "common.reviews": "đánh giá",
    "common.preorder": "Đặt trước",
    "common.inStock": "Có sẵn",
    "footer.tagline":
      "Blooming — Order hộ mỹ phẩm chính hãng từ Hàn Quốc. Skincare, trang điểm từ các thương hiệu Hàn Quốc & quốc tế.",
    "footer.shop": "Mua sắm",
    "footer.support": "Hỗ trợ",
    "footer.about": "Về Blooming",
  },
  ko: {
    "nav.best": "베스트",
    "nav.new": "신상품",
    "nav.skincare": "스킨케어",
    "nav.makeup": "메이크업",
    "nav.mask": "마스크팩",
    "nav.suncare": "선케어",
    "nav.lip": "립",
    "nav.supplement": "건강기능식품",
    "nav.fragrance": "향수",
    "nav.brands": "브랜드",
    "nav.sale": "세일",
    "header.searchPlaceholder": "상품, 브랜드 검색…",
    "header.account": "내 계정",
    "header.wishlist": "위시리스트",
    "header.cart": "장바구니",
    "header.language": "언어",
    "header.freeship": "한국에서 정품 대리구매 · 베트남까지 배송비 kg 단위 · 대량 주문 샘플 증정",
    "home.bestTitle": "이번 주 베스트",
    "home.bestSub": "최근 7일 판매량 기준",
    "home.newTitle": "새로 들어온 상품",
    "home.viewAll": "전체 보기",
    "home.heroKicker": "Glow Week",
    "home.heroTitle": "매일매일, 자연스러운 광채",
    "home.heroSub":
      "인기 보습·선케어 라인 최대 40% 할인. 한국 정품 대리구매, 베트남까지 배송비 kg 단위.",
    "home.heroCta": "지금 쇼핑하기",
    "common.addToCart": "장바구니 담기",
    "common.buyNow": "바로 구매",
    "common.sold": "판매",
    "common.reviews": "리뷰",
    "common.preorder": "예약주문",
    "common.inStock": "재고 있음",
    "footer.tagline":
      "Blooming — 정품 뷰티 스토어. 한국 및 해외 브랜드의 스킨케어, 메이크업.",
    "footer.shop": "쇼핑",
    "footer.support": "고객지원",
    "footer.about": "Blooming 소개",
  },
} as const;

export type DictKey = keyof (typeof dict)["vi"];

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(LOCALE_COOKIE)?.value;
  return v === "ko" ? "ko" : "vi";
}

export function getDictionary(locale: Locale) {
  const table = dict[locale];
  return (key: DictKey) => table[key] ?? dict.vi[key] ?? key;
}

export type T = ReturnType<typeof getDictionary>;

/** Chọn trường theo locale cho nội dung động (name/nameKo…) */
export function pick<T extends string | null | undefined>(
  locale: Locale,
  vi: T,
  ko: T,
): string {
  if (locale === "ko" && ko) return ko;
  return vi ?? "";
}

/**
 * Tên sản phẩm hiển thị:
 *  - khách xem tiếng Hàn (locale "ko") + có nameKo → nameKo
 *  - còn lại theo cấu hình cửa hàng: "en" + có nameEn → nameEn, ngược lại name (VN)
 */
export function productName(
  locale: Locale,
  nameLang: "vi" | "en",
  p: { name: string; nameEn?: string | null; nameKo?: string | null },
): string {
  if (locale === "ko" && p.nameKo) return p.nameKo;
  if (nameLang === "en" && p.nameEn) return p.nameEn;
  return p.name;
}
