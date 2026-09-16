"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setShowPricesAction } from "@/lib/admin-actions";
import { useAdminT } from "./admin-i18n";

export function PriceVisibilityToggle({ initial }: { initial: boolean }) {
  const t = useAdminT();
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function toggle() {
    const next = !on;
    setErr(null);
    setOn(next);
    start(async () => {
      const res = await setShowPricesAction(next);
      if (res.ok) router.refresh();
      else {
        setOn(!next);
        setErr(res.error ?? t("common.error"));
      }
    });
  }

  return (
    <div className="bg-white border border-line rounded-card p-5 max-w-[560px] mb-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-bold mb-1">{t("settings.showPrices")}</div>
          <p className="text-[12px] text-muted-2 leading-relaxed">
            {t("settings.showPricesHint")}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={pending}
          onClick={toggle}
          className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-60 ${
            on ? "bg-bloom" : "bg-[#D6D6D0]"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
              on ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
      <div
        className={`mt-3 text-[12px] font-semibold ${
          on ? "text-success" : "text-sale"
        }`}
      >
        {on ? `✓ ${t("settings.showPricesOn")}` : `● ${t("settings.showPricesOff")}`}
      </div>
      {err && <p className="text-[12px] text-sale mt-1.5">{err}</p>}
    </div>
  );
}
