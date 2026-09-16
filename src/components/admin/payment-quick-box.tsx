"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOrderPaymentAction } from "@/lib/admin-actions";
import { formatVND } from "@/lib/format";
import {
  PAY_METHODS,
  PAY_METHOD_VI,
  normPayMethod,
} from "@/lib/constants";
import { useAdminT } from "./admin-i18n";

type PayState = "UNPAID" | "DEPOSIT_PAID" | "PAID";

const OPTIONS: readonly [PayState, string][] = [
  ["UNPAID", "Chưa thanh toán"],
  ["DEPOSIT_PAID", "Đã đặt cọc"],
  ["PAID", "Đã thanh toán đủ"],
];

/**
 * Đổi nhanh trạng thái thanh toán ngay ở khối chi tiết đơn — dùng khi khách
 * đã chuyển khoản / đưa tiền cọc mà đơn không đi qua luồng VietQR.
 */
export function PaymentQuickBox({
  orderId,
  paymentStatus,
  provider,
  depositAmount,
  balanceAmount,
}: {
  orderId: string;
  paymentStatus: string;
  provider: string | null;
  depositAmount: number;
  balanceAmount: number;
}) {
  const t = useAdminT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState(normPayMethod(provider));

  function apply(status: PayState, amount?: number) {
    setErr(null);
    start(async () => {
      const res = await setOrderPaymentAction({
        orderId,
        paymentStatus: status,
        depositAmount: amount,
        method,
      });
      if (res.ok) router.refresh();
      else setErr(res.error ?? t("common.error"));
    });
  }

  return (
    <div className="border border-line rounded-[10px] p-3.5 mb-4">
      <div className="text-[12px] font-bold text-muted mb-2.5">
        {t("orders.payment")}
      </div>
      <label className="flex items-center gap-2 text-[11.5px] text-muted-2 mb-2">
        <span className="shrink-0">Hình thức:</span>
        <select
          value={method}
          onChange={(e) => setMethod(normPayMethod(e.target.value))}
          className="flex-1 h-8 border border-line rounded-md px-2 text-[12px] bg-white"
        >
          {PAY_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAY_METHOD_VI[m]}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-1.5">
        {OPTIONS.map(([v, label]) => (
          <button
            key={v}
            type="button"
            disabled={pending}
            onClick={() => apply(v)}
            className={`text-[11.5px] px-2.5 py-1.5 rounded-md border disabled:opacity-60 ${
              paymentStatus === v
                ? "border-bloom bg-[#E7F1FA] text-bloom font-semibold"
                : "border-line text-muted hover:border-bloom"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-2.5 text-[11.5px] text-muted-2">
        <span className="shrink-0">Cọc số tiền:</span>
        <input
          type="number"
          min={0}
          step={1}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="0"
          className="w-28 h-8 border border-line rounded-md px-2 text-[12px] text-right"
        />
        <button
          type="button"
          disabled={pending || !(Number(custom) > 0)}
          onClick={() => apply("DEPOSIT_PAID", Number(custom))}
          className="h-8 px-2.5 bg-bloom text-white rounded-md text-[11.5px] font-semibold disabled:opacity-40"
        >
          Ghi nhận
        </button>
      </div>

      {paymentStatus !== "UNPAID" && (
        <div className="mt-2.5 text-[12px] flex flex-col gap-0.5">
          <div className="flex justify-between">
            <span className="text-muted-2">Đã thu</span>
            <span className="font-semibold text-success">
              {formatVND(depositAmount)}
            </span>
          </div>
          {balanceAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-2">Còn phải thu</span>
              <span className="font-bold text-sale">
                {formatVND(balanceAmount)}
              </span>
            </div>
          )}
        </div>
      )}

      {err && <p className="text-[12px] text-sale mt-1.5">{err}</p>}
    </div>
  );
}
