"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmBankTransferAction } from "@/lib/admin-actions";
import { formatVND } from "@/lib/format";
import { useAdminT } from "./admin-i18n";

export function BankTransferBox({
  orderId,
  code,
  amount,
  status,
  reportedAt,
  paidAt,
}: {
  orderId: string;
  code: string;
  amount: number;
  status: string;
  reportedAt: string | null;
  paidAt: string | null;
}) {
  const t = useAdminT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const done = status === "PAID";

  return (
    <div className="border border-line rounded-[10px] p-3.5 mb-4">
      <div className="text-[12px] font-bold text-muted mb-2.5">
        {t("orders.payment")} — {t("orders.bankTransfer")}
      </div>
      <div className="flex justify-between text-[12px] mb-1">
        <span className="text-muted-2">{t("orders.total")}</span>
        <span className="font-semibold">{formatVND(amount)}</span>
      </div>
      {reportedAt && (
        <div className="text-[12px] text-[#3A6EA5] mb-1">
          {t("orders.customerReported").replace("%s", reportedAt)}
        </div>
      )}
      {done ? (
        <div className="text-[12px] text-success font-semibold mt-2">
          ✓ {t("orders.transferConfirmed")}
          {paidAt ? ` · ${paidAt}` : ""}
        </div>
      ) : (
        <button
          disabled={pending}
          onClick={() => {
            if (
              !window.confirm(
                t("orders.confirmTransferAsk").replace("%s", code),
              )
            )
              return;
            setErr(null);
            start(async () => {
              const res = await confirmBankTransferAction(orderId);
              if (res.ok) router.refresh();
              else setErr(res.error ?? t("common.error"));
            });
          }}
          className="w-full h-10 mt-2 bg-bloom text-white hover:bg-bloom-ink rounded-lg text-[13px] font-semibold disabled:opacity-60"
        >
          {t("orders.confirmTransfer")}
        </button>
      )}
      {err && <p className="text-[12px] text-sale mt-1.5">{err}</p>}
    </div>
  );
}
