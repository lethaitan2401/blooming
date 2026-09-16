"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateShippingPromoAction } from "@/lib/admin-actions";
import { formatVND } from "@/lib/format";
import { useAdminT } from "./admin-i18n";

export function ShippingPromoForm({
  sampleThreshold,
  krShipPerKg,
}: {
  sampleThreshold: number;
  krShipPerKg: number;
}) {
  const t = useAdminT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sample, setSample] = useState(String(sampleThreshold));
  const [perKg, setPerKg] = useState(String(krShipPerKg || ""));

  return (
    <div className="bg-white border border-line rounded-card p-5 max-w-[560px] mb-5">
      <div className="text-[13px] font-bold mb-1">{t("settings.shipPromo")}</div>
      <p className="text-[12px] text-muted-2 mb-4 leading-relaxed">
        {t("settings.shipPromoHint")}
      </p>
      <form
        action={(fd) => {
          setMsg(null);
          start(async () => {
            const res = await updateShippingPromoAction(fd);
            if (res.ok) {
              setMsg({ ok: true, text: t("settings.saved") });
              router.refresh();
            } else {
              setMsg({ ok: false, text: res.error ?? t("common.error") });
            }
          });
        }}
        className="flex flex-col gap-3"
      >
        <label className="block">
          <span className="text-[12px] font-semibold text-[#4A4A4A] mb-1 block">
            {t("settings.sampleThreshold")}
          </span>
          <input
            name="sampleThreshold"
            type="number"
            min={0}
            step={1}
            value={sample}
            onChange={(e) => setSample(e.target.value)}
            className="w-full h-10 border border-line rounded-lg px-3 text-[13px] outline-none focus:border-bloom"
          />
          <span className="text-[11.5px] text-muted-2 mt-1 block">
            {formatVND(Number(sample) || 0)}
          </span>
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-[#4A4A4A] mb-1 block">
            {t("settings.krShipPerKg")}
          </span>
          <input
            name="krShipPerKg"
            type="number"
            min={0}
            step={1}
            value={perKg}
            onChange={(e) => setPerKg(e.target.value)}
            placeholder="0"
            className="w-full h-10 border border-line rounded-lg px-3 text-[13px] outline-none focus:border-bloom"
          />
          <span className="text-[11.5px] text-muted-2 mt-1 block">
            {t("settings.krShipPerKgHint")}
          </span>
        </label>
        <div className="flex items-center gap-3 mt-1">
          <button
            disabled={pending}
            className="h-10 px-5 bg-bloom text-white hover:bg-bloom-ink rounded-lg text-[13px] font-semibold disabled:opacity-60"
          >
            {t("settings.save")}
          </button>
          {msg && (
            <span
              className={`text-[12px] ${msg.ok ? "text-success" : "text-sale"}`}
            >
              {msg.ok ? "✓ " : ""}
              {msg.text}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
