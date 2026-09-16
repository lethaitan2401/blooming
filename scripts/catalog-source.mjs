/**
 * Catalog Blooming — lấy data + ảnh CHÍNH HÃNG từ store Shopify của từng brand (cách 1).
 *
 *  - PRODUCTS: danh sách "hot" được gắn nhãn best/new (OY Awards 2025 + xu hướng 2026)
 *  - BULK: các brand sẽ lấy THÊM nhiều sản phẩm (tự phân loại), không gắn nhãn
 *
 * Giá gốc (USD) → quy đổi ở dưới.
 */

// map slug brand nội bộ -> domain Shopify chính hãng
export const STORES = {
  "beauty-of-joseon": "beautyofjoseon.com",
  "round-lab": "roundlab.com",
  skin1004: "skin1004.com",
  cosrx: "cosrx.com",
  anua: "anua.com",
  dalba: "dalba.com",
  "axis-y": "axis-y.com",
  medicube: "medicube.us",
  torriden: "torriden.us",
  klairs: "klairs.com",
  haruharu: "haruharuwonder.com",
  rejuran: "rejurancosmetics.com",
  dasique: "dasique.com",
  fwee: "fwee.us",
  tonymoly: "tonymoly.us",
};

/**
 * Brand không có store Shopify riêng → lấy qua collection của retailer.
 * Giá theo tiền retailer, quy đổi về VND bằng `rateToVnd`.
 */
export const RETAILERS = [
  {
    brand: "ilso",
    brandName: "ilso",
    url: "https://pretties.com.hk/collections/ilso/products.json?limit=50",
    rateToVnd: 2600, // HKD -> VND (đã trừ bớt markup HK)
    hkdToKrw: 165, // HKD -> KRW (ước tính giá nhập)
    map: [
      { match: /deep clean master/i, cat: "lam-sach", best: true, name: "ilso Deep Clean Master — Dụng cụ lấy mụn đầu đen" },
      { match: /moringa tightening pore serum/i, cat: "serum", isNew: true, name: "ilso Moringa Tightening Pore Serum 30ml" },
      { match: /natural mild clear nose pack/i, cat: "mat-na", name: "ilso Natural Mild Clear Nose Pack (5 miếng)" },
      { match: /super melting sebum softener/i, cat: "toner", best: true, name: "ilso Super Melting Sebum Softener 150ml" },
    ],
  },
  {
    // makeup đa thương hiệu (rom&nd, Peripera, CLIO, ETUDE…) từ retailer Mỹ
    useVendor: true,
    isUsd: true,
    max: 40,
    url: "https://sokoglam.com/collections/makeup/products.json?limit=250",
  },
];

/** vendor retailer -> slug brand nội bộ */
export const KNOWN_BRAND_SLUGS = {
  "rom&nd": "romand",
  romand: "romand",
  peripera: "peripera",
  clio: "clio",
  etude: "etude",
  "etude house": "etude",
  "3ce": "3ce",
  dasique: "dasique",
  fwee: "fwee",
  hince: "hince",
  wakemake: "wakemake",
  colorgram: "colorgram",
  "tony moly": "tonymoly",
  tonymoly: "tonymoly",
  missha: "missha",
  abib: "abib",
  tocobo: "tocobo",
  heimish: "heimish",
  "ma:nyo": "manyo",
};

export const BRAND_NAMES = {
  ilso: "ilso",
  "beauty-of-joseon": "Beauty of Joseon",
  "round-lab": "Round Lab",
  skin1004: "SKIN1004",
  cosrx: "COSRX",
  anua: "Anua",
  dalba: "d'Alba",
  "axis-y": "Axis-Y",
  medicube: "Medicube",
  torriden: "Torriden",
  klairs: "Klairs",
  haruharu: "Haruharu Wonder",
  rejuran: "REJURAN",
  dasique: "Dasique",
  fwee: "fwee",
  tonymoly: "TONYMOLY",
  // makeup brand nhận từ retailer
  romand: "rom&nd",
  peripera: "Peripera",
  clio: "CLIO",
  etude: "ETUDE",
  "3ce": "3CE",
  hince: "hince",
  wakemake: "wakemake",
  colorgram: "Colorgram",
  missha: "MISSHA",
  abib: "Abib",
  tocobo: "TOCOBO",
  heimish: "Heimish",
  manyo: "Ma:nyo",
};

/** Brand nào lấy thêm nhiều SP + số lượng tối đa mỗi brand */
export const BULK = [
  { brand: "beauty-of-joseon", max: 40 },
  { brand: "round-lab", max: 40 },
  { brand: "skin1004", max: 40 },
  { brand: "cosrx", max: 50 },
  { brand: "anua", max: 40 },
  { brand: "torriden", max: 24 },
  { brand: "klairs", max: 30 },
  { brand: "haruharu", max: 30 },
  { brand: "dalba", max: 20 },
  { brand: "axis-y", max: 20 },
  { brand: "medicube", max: 40 },
  { brand: "rejuran", max: 40 },
  { brand: "dasique", max: 32 },
  { brand: "fwee", max: 16 },
  { brand: "tonymoly", max: 10 },
];

// danh mục nội bộ: toner, essence, serum, kem-duong, chong-nang, lam-sach, mat-na
export const PRODUCTS = [
  // ---------- TONER ----------
  { brand: "round-lab", handle: "1025-dokdo-toner", cat: "toner", best: true, rank: "OY Awards 2025 · Toner #1" },
  { brand: "anua", handle: "heartleaf-77-soothing-toner", cat: "toner", best: true, rank: "OY Awards 2025 · Toner #2" },
  { brand: "cosrx", handle: "aha-bha-clarifying-treatment-toner", cat: "toner", best: true },
  { brand: "skin1004", handle: "skin1004-madagascar-centella-toning-toner", cat: "toner" },
  { brand: "anua", handle: "rice-70-glow-milky-toner", cat: "toner", isNew: true, rank: "Xu hướng 2026 · toner sữa gạo" },

  // ---------- ESSENCE / SERUM ----------
  { brand: "cosrx", handle: "advanced-snail-96-mucin-power-essence", cat: "essence", best: true, rank: "Best-seller toàn cầu" },
  { brand: "torriden", handle: "dive-in-serum", cat: "serum", best: true, rank: "OY Awards 2025 · Serum #1" },
  { brand: "beauty-of-joseon", handle: "glow-deep-serum-rice-alpha-arbutin", cat: "serum", best: true },
  { brand: "anua", handle: "pdrn-hyaluronic-acid-capsule-100-serum-1", cat: "serum", isNew: true, preorder: true, rank: "Xu hướng 2026 · PDRN" },
  { brand: "anua", handle: "niacinamide-10-txa-4-serum-2", cat: "serum", isNew: true, rank: "Xu hướng 2026 · làm sáng, mờ thâm" },
  { brand: "anua", handle: "azelaic-acid-10-hyaluron-redness-soothing-serum", cat: "serum", isNew: true },
  { brand: "skin1004", handle: "skin1004-madagascar-centella-ampoule", cat: "serum", best: true },
  { brand: "beauty-of-joseon", handle: "glow-serum-propolis-niacinamide", cat: "serum" },
  { brand: "dalba", handle: "dalba-white-truffle-first-spray-serum", cat: "serum", rank: "OY Awards 2025 · Xịt dưỡng" },
  { brand: "axis-y", handle: "dark-spot-correcting-glow-serum", cat: "serum" },

  // ---------- CREAM ----------
  { brand: "cosrx", handle: "advanced-snail-92-all-in-one-cream", cat: "kem-duong", best: true },
  { brand: "beauty-of-joseon", handle: "dynasty-cream", cat: "kem-duong", best: true },
  { brand: "anua", handle: "pdrn-hyaluronic-acid-100-moisturizing-cream", cat: "kem-duong", isNew: true, preorder: true, rank: "Xu hướng 2026 · PDRN" },

  // ---------- SUN CARE ----------
  { brand: "round-lab", handle: "birch-juice-moisturizing-sun-serum-spf50", cat: "chong-nang", best: true, rank: "OY Awards 2025 · Chống nắng #1" },
  { brand: "skin1004", handle: "hyalu-cica-water-fit-sun-serum-spf50-pa", cat: "chong-nang", best: true, rank: "Xu hướng 2026 · sun serum" },
  { brand: "beauty-of-joseon", handle: "relief-sun-rice-probiotics", cat: "chong-nang", best: true, rank: "Best-seller toàn cầu" },

  // ---------- CLEANSER ----------
  { brand: "cosrx", handle: "low-ph-good-morning-gel-cleanser", cat: "lam-sach", best: true },
  { brand: "round-lab", handle: "1025-dokdo-cleanser", cat: "lam-sach" },

  // ---------- TONER PAD ----------
  { brand: "medicube", handle: "pdrn-pink-collagen-gel-toner-pad", cat: "toner", isNew: true, rank: "Xu hướng 2026 · PDRN pad" },
  { brand: "anua", handle: "heartleaf-77-toner-pad-160ml", cat: "toner", isNew: true },

  // ---------- EYE / TREATMENT ----------
  { brand: "beauty-of-joseon", handle: "revive-eye-serum-ginseng-retinal", cat: "serum", isNew: true, rank: "Xu hướng 2026 · retinal" },
  { brand: "cosrx", handle: "the-retinol-0-1-cream-1", cat: "kem-duong" },
  { brand: "cosrx", handle: "the-vitamin-c-23-serum", cat: "serum", best: true },

  // ---------- TORRIDEN (đủ 3 dòng: DIVE-IN / BALANCEFUL / CELLMAZING) ----------
  { brand: "torriden", handle: "dive-in-toner", cat: "toner", best: true, rank: "Dưỡng ẩm HA phân tử thấp" },
  { brand: "torriden", handle: "dive-in-cream", cat: "kem-duong", best: true },
  { brand: "torriden", handle: "dive-in-cleansing-foam", cat: "lam-sach" },
  { brand: "torriden", handle: "dive-in-multi-pad", cat: "toner", isNew: true },
  { brand: "torriden", handle: "dive-in-mask", cat: "mat-na" },
  { brand: "torriden", handle: "balanceful-serum", cat: "serum", rank: "Cica · da dầu mụn" },
  { brand: "torriden", handle: "balanceful-cream", cat: "kem-duong" },
  { brand: "torriden", handle: "balanceful-toner-pad", cat: "toner", isNew: true },
  { brand: "torriden", handle: "balanceful-cleansing-foam", cat: "lam-sach" },
  { brand: "torriden", handle: "solid-in-cream", cat: "kem-duong", rank: "Ceramide phục hồi hàng rào" },
  { brand: "torriden", handle: "solid-in-essence", cat: "essence" },
  { brand: "torriden", handle: "cellmazing-firming-cream", cat: "kem-duong", isNew: true, rank: "Collagen · săn chắc" },
  { brand: "torriden", handle: "cellmazing-brightening-ampoule", cat: "serum", isNew: true },

  // ---------- REJURAN (c-PDRN cao cấp) ----------
  { brand: "rejuran", handle: "skin-protection-mask", cat: "mat-na", best: true, rank: "OY Awards 2025 · Slow-Aging" },
  { brand: "rejuran", handle: "healer-turnover-ampoule", cat: "serum", best: true, rank: "Hero · tái tạo da" },
  { brand: "rejuran", handle: "recover-c-pdrn-lifting-ampoule", cat: "serum", isNew: true, preorder: true, rank: "c-PDRN nâng cơ" },
  { brand: "rejuran", handle: "healer-nutritive-cream", cat: "kem-duong" },
  { brand: "rejuran", handle: "moisture-treatment-toner", cat: "toner" },
  { brand: "rejuran", handle: "pore-tightening-toner-pad", cat: "toner", isNew: true },
  { brand: "rejuran", handle: "skin-barrier-sunscreen", cat: "chong-nang", isNew: true },
];

/** Loại bỏ combo/quà tặng/sample/travel kit / hàng không phải skincare-makeup mặt… */
export function isJunk(title, minUsd, makeup = false) {
  if (!(minUsd > 0)) return true;
  if (
    /gift|sample|\bkit\b|\bset\b|\bduo\b|\btrio\b|bundle|subscr|\[deal\]|\[amazon\]|travel|routine|reward|discovery|full set|combo|value|applicator|makeup bag|\bpouch\b|keychain|\bbrush\b|\bpuff\b|sponge|headband|hair band|\btool\b/i.test(
      title,
    )
  )
    return true;
  if (
    !makeup &&
    /\bpack\b|\bmini\b|\d ?ml\b.*\bx ?\d|\b(5|4|3|8|10|12|15)ml\b/i.test(title)
  )
    return true;
  if (
    /\b(body|hand|foot|feet|hair|shampoo|conditioner|scalp|\bnail\b|deodorant|perfume|fragrance|\bsoap\b|device|headband)\b/i.test(
      title,
    )
  )
    return true;
  if (
    !makeup &&
    /\b(lip balm|lip mask|lip sleeping|lip essence|lip oil|lip serum)\b/i.test(
      title,
    )
  )
    return true;
  return false;
}

/** Suy ra danh mục nội bộ. `makeup`=true khi nguồn là brand/collection makeup. */
export function categorize(title, makeup = false) {
  const t = title.toLowerCase();
  if (makeup) {
    if (
      /(lip tint|lip gloss|lipstick|lip lacquer|lip mousse|lip stain|lip plumper|lip liner|lip pencil|lip serum|lip balm|lip oil|lip mask|tinted lip|water tint|velvet tint|juicy.*tint|dewy.*tint|glow tint|lasting tint|blur.*tint|mood.*tint|voluming tint|voluming gloss|voluming plumper|changing gloss|color balm|lip combo|lip \+ liner)/i.test(
        t,
      )
    )
      return "son-moi";
    if (
      /(cushion|foundation|\bbb cream\b|cc cream|concealer|corrector|powder|\bpact\b|blush|\bcheek\b|highlighter|contour|shading|bronzer|primer|eyeshadow|eye shadow|eye palette|shadow palette|shadow stick|quad shadow|mascara|eyeliner|eye liner|pen liner|\bbrow\b|glow pot|color pot|jelly pot|glow stick|glow base|shell base|glowy base|rolling pot|makeup base)/i.test(
        t,
      )
    )
      return "trang-diem";
  }
  if (/\b(spf ?\d|sun serum|sun cream|sun stick|sunscreen|sun milk|dayscreen|sun lotion|uv )/i.test(t))
    return "chong-nang";
  if (/(cleansing oil|cleanser|cleansing foam|cleansing balm|cleansing gel|cleansing milk|cleansing water|micellar|makeup remover|foam cleanser|face wash|oil cleanser|peeling gel|clay mask cleanser|scrub)/i.test(t))
    return "lam-sach";
  if (
    /(sheet mask|face mask|sleeping mask|sleeping pack|wrapping mask|overnight mask|modeling mask|hydrogel mask|lifting mask|protection mask|treatment mask|gel mask|barrier mask|calming mask|turnover mask|infused.*mask|mask$)/i.test(
      t,
    ) &&
    !/spot patch|cleanser|clay mask cleanser/i.test(t)
  )
    return "mat-na";
  if (/\bpad\b|\bpads\b|toner pad/i.test(t)) return "toner";
  if (/\btoner\b|milky toner|skin softener/i.test(t)) return "toner";
  if (/\bessence\b/i.test(t)) return "essence";
  if (/(serum|ampoule|booster|\bdrop\b|treatment)/i.test(t)) return "serum";
  if (/(eye cream|eye serum|eye balm|eye patch|under eye|firming moisturizer)/i.test(t))
    return "serum";
  if (/(cream|moistur|lotion|\bgel\b|balm|butter|emulsion)/i.test(t))
    return "kem-duong";
  return null;
}

/**
 * USD (giá store Mỹ) -> VND giá bán lẻ tại VN (~15.5k, làm tròn 1000).
 */
export function toVND(usd) {
  return Math.round((usd * 15500) / 1000) * 1000;
}

/** Tỉ giá ₩ -> ₫ mặc định (đồng bộ với src/lib/settings.ts) */
export const KRW_RATE = 18;

/** USD -> giá nhập ước tính bằng ₩ (mua trên sale ~ giá store ×550₩/USD) */
export function costKRW(usd) {
  return Math.round((usd * 550) / 100) * 100;
}
/** Giá vốn VND = costKRW × tỉ giá */
export function costVND(usd) {
  return Math.round((costKRW(usd) * KRW_RATE) / 1000) * 1000;
}
