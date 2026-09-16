"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  advanceOrderAction,
  createShipmentAction,
  deleteOrderAction,
} from "@/lib/admin-actions";
import { useAdminT } from "./admin-i18n";

export function OrderActions({
  orderId,
  code,
  status,
  hasShipment,
}: {
  orderId: string;
  code: string;
  status: string;
  hasShipment: boolean;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const t = useAdminT();
  const canAdvance = ![
    "COMPLETED",
    "CANCELLED",
    "RETURNED",
    "REFUNDED",
  ].includes(status);

  return (
    <div className="flex flex-col gap-2">
      {canAdvance && (
        <button
          disabled={pending}
          onClick={() => start(() => advanceOrderAction(orderId).then(() => {}))}
          className="h-10 bg-bloom text-white hover:bg-bloom-ink rounded-lg text-[13px] font-semibold disabled:opacity-60"
        >
          {status === "PENDING" ? t("orders.confirm") : t("orders.advance")}
        </button>
      )}
      {!hasShipment && (
        <button
          disabled={pending}
          onClick={() =>
            start(() => createShipmentAction(orderId).then(() => {}))
          }
          className="h-10 bg-bloom text-white rounded-lg text-[12.5px] font-semibold disabled:opacity-60"
        >
          {t("orders.createShipment")}
        </button>
      )}
      <button
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("orders.deleteConfirm").replace("%s", code)))
            return;
          setErr(null);
          start(async () => {
            const res = await deleteOrderAction(orderId);
            if (res.ok) router.push("/admin/orders");
            else setErr(res.error ?? t("common.error"));
          });
        }}
        className="h-9 border border-line text-sale rounded-lg text-[12px] font-semibold hover:bg-[#FBEAEA] disabled:opacity-60"
      >
        {t("orders.delete")}
      </button>
      {err && <p className="text-[12px] text-sale">{err}</p>}
    </div>
  );
}
