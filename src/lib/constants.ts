export const SESSION_COOKIE = "blooming_session";
export const CART_COOKIE = "blooming_cart";
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Hình thức thanh toán (khớp enum Prisma PaymentProvider) */
export const PAY_METHODS = [
  "BANK_TRANSFER",
  "VNPAY",
  "MOMO",
  "ZALOPAY",
  "COD",
] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

export const PAY_METHOD_VI: Record<PayMethod, string> = {
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
  VNPAY: "VNPAY",
  MOMO: "MoMo",
  ZALOPAY: "ZaloPay",
  COD: "Tiền mặt / COD",
};

export function normPayMethod(m?: string | null): PayMethod {
  return (PAY_METHODS as readonly string[]).includes(m ?? "")
    ? (m as PayMethod)
    : "BANK_TRANSFER";
}
