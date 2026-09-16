/** Định dạng tiền VND: 294000 -> "294.000₫" */
export function formatVND(amount: number): string {
  return `${Math.round(amount).toLocaleString("vi-VN")}₫`;
}

/** Rút gọn: 14_820_000 -> "14,82 tr₫" (dùng cho dashboard) */
export function formatVNDShort(amount: number): string {
  if (amount >= 1_000_000_000)
    return `${(amount / 1_000_000_000).toFixed(2).replace(".", ",")} tỷ₫`;
  if (amount >= 1_000_000)
    return `${(amount / 1_000_000).toFixed(2).replace(".", ",")} tr₫`;
  if (amount >= 1_000)
    return `${(amount / 1_000).toFixed(0)}k₫`;
  return `${amount}₫`;
}

/** Giá đang áp dụng của một biến thể (xét lịch khuyến mãi) */
export function effectivePrice(v: {
  price: number;
  salePrice: number | null;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
}): { price: number; original: number | null; onSale: boolean } {
  const now = Date.now();
  const inWindow =
    (!v.saleStartsAt || v.saleStartsAt.getTime() <= now) &&
    (!v.saleEndsAt || v.saleEndsAt.getTime() >= now);
  if (v.salePrice != null && v.salePrice < v.price && inWindow) {
    return { price: v.salePrice, original: v.price, onSale: true };
  }
  return { price: v.price, original: null, onSale: false };
}

export function discountPercent(original: number, price: number): number {
  if (original <= 0) return 0;
  return Math.round((1 - price / original) * 100);
}

export function orderCode(seq: number): string {
  return `OL${(seq + 25800).toString().padStart(5, "0")}`;
}

export function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

export function formatDateTime(d: Date): string {
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
