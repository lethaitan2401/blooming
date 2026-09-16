import "server-only";
import { db } from "./db";

/** Tỉ giá mặc định: 1 ₩ ≈ 18 ₫ */
export const DEFAULT_KRW_RATE = 18;

export async function getKrwRate(): Promise<number> {
  const s = await db.setting.findUnique({ where: { key: "krwRate" } });
  const v = typeof s?.value === "number" ? s.value : Number(s?.value);
  return v && v > 0 ? v : DEFAULT_KRW_RATE;
}

export async function setKrwRate(rate: number) {
  await db.setting.upsert({
    where: { key: "krwRate" },
    create: { key: "krwRate", value: rate },
    update: { value: rate },
  });
}

/** Quy đổi ₩ -> ₫ theo tỉ giá */
export function krwToVnd(krw: number, rate: number): number {
  return Math.round(krw * rate);
}

/** Giá bán (VND) = giá vốn × (1 + %lãi), làm tròn nghìn. 0 nếu chưa có giá vốn. */
export function sellPrice(costPrice: number, markupPct: number): number {
  if (costPrice <= 0) return 0;
  return Math.round((costPrice * (100 + markupPct)) / 100 / 1000) * 1000;
}

/* ---------------- Tài khoản nhận chuyển khoản (VietQR) ---------------- */
export type BankInfo = {
  bankName: string;
  bankBin: string; // mã napas (Vietcombank = 970436)
  account: string;
  holder: string;
};
const DEFAULT_BANK: BankInfo = {
  bankName: "Vietcombank",
  bankBin: "970436",
  account: "1016598530",
  holder: "LE THAI TAN",
};

export async function getBankInfo(): Promise<BankInfo> {
  const s = await db.setting.findUnique({ where: { key: "bank" } });
  const v = s?.value as Partial<BankInfo> | undefined;
  return {
    bankName: v?.bankName || DEFAULT_BANK.bankName,
    bankBin: v?.bankBin || DEFAULT_BANK.bankBin,
    account: v?.account || DEFAULT_BANK.account,
    holder: v?.holder || DEFAULT_BANK.holder,
  };
}

export async function setBankInfo(info: BankInfo) {
  await db.setting.upsert({
    where: { key: "bank" },
    create: { key: "bank", value: info },
    update: { value: info },
  });
}

/* ---------------- Vận chuyển & khuyến mãi ---------------- */

/** Ngưỡng (VND) mà đơn đạt tới thì được tặng mẫu thử. Mặc định 500.000₫. */
export const DEFAULT_SAMPLE_THRESHOLD = 500000;

export async function getSampleThreshold(): Promise<number> {
  const s = await db.setting.findUnique({ where: { key: "sampleThreshold" } });
  const v = typeof s?.value === "number" ? s.value : Number(s?.value);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_SAMPLE_THRESHOLD;
}

export async function setSampleThreshold(vnd: number) {
  await db.setting.upsert({
    where: { key: "sampleThreshold" },
    create: { key: "sampleThreshold", value: vnd },
    update: { value: vnd },
  });
}

/**
 * Đơn giá tham khảo phí ship Hàn → VN (VND / kg). Chỉ để nhân viên tra khi
 * tính phí thực cho từng đơn — KHÔNG cộng tự động vào giỏ. Mặc định 0 (chưa đặt).
 */
export async function getKrShipPerKg(): Promise<number> {
  const s = await db.setting.findUnique({ where: { key: "krShipPerKg" } });
  const v = typeof s?.value === "number" ? s.value : Number(s?.value);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export async function setKrShipPerKg(vnd: number) {
  await db.setting.upsert({
    where: { key: "krShipPerKg" },
    create: { key: "krShipPerKg", value: vnd },
    update: { value: vnd },
  });
}

/* ---------------- Hiển thị giá ngoài storefront ---------------- */

/**
 * Bật/tắt hiển thị giá cho khách. Tắt = chế độ "xem tham khảo": ẩn giá,
 * ẩn nút mua — khách chỉ xem sản phẩm. Mặc định: bật.
 */
export async function getShowPrices(): Promise<boolean> {
  const s = await db.setting.findUnique({ where: { key: "showPrices" } });
  if (s == null) return true;
  return s.value !== false;
}

export async function setShowPrices(on: boolean) {
  await db.setting.upsert({
    where: { key: "showPrices" },
    create: { key: "showPrices", value: on },
    update: { value: on },
  });
}

/** Ngôn ngữ mặc định hiển thị TÊN sản phẩm ngoài storefront: "vi" | "en". */
export async function getProductNameLang(): Promise<"vi" | "en"> {
  const s = await db.setting.findUnique({ where: { key: "productNameLang" } });
  return s?.value === "en" ? "en" : "vi";
}

export async function setProductNameLang(lang: "vi" | "en") {
  await db.setting.upsert({
    where: { key: "productNameLang" },
    create: { key: "productNameLang", value: lang === "en" ? "en" : "vi" },
    update: { value: lang === "en" ? "en" : "vi" },
  });
}

/** URL ảnh VietQR động (img.vietqr.io) — quét là điền sẵn số tiền + nội dung. */
export function vietQrUrl(
  bank: BankInfo,
  amount: number,
  addInfo: string,
  template: "compact2" | "qr_only" | "print" = "compact2",
): string {
  const p = new URLSearchParams({
    amount: String(Math.max(0, Math.round(amount))),
    addInfo,
    accountName: bank.holder,
  });
  return `https://img.vietqr.io/image/${bank.bankBin}-${bank.account}-${template}.png?${p}`;
}
