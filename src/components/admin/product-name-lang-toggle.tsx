"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProductNameLangAction } from "@/lib/admin-actions";
import { useAdminT } from "./admin-i18n";

export function ProductNameLangToggle({ initial }: { initial: "vi" | "en" }) {
  const t = useAdminT();
  const router = useRouter();
  const [lang, setLang] = useState<"vi" | "en">(initial);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function pick(next: "vi" | "en") {
    if (next === lang) return;
    setErr(null);
    setLang(next);
    start(async () => {
      const res = await setProductNameLangAction(next);
      if (res.ok) router.refresh();
      else {
        setLang(lang);
        setErr(res.error ?? t("common.error"));
      }
    });
  }

  return (
    <div className="bg-white border border-line rounded-card p-5 max-w-[560px] mb-5">
      <div className="text-[13px] font-bold mb-1">{t("settings.nameLang")}</div>
      <p className="text-[12px] text-muted-2 mb-4 leading-relaxed">
        {t("settings.nameLangHint")}
      </p>
      <div className="inline-flex rounded-lg border border-line overflow-hidden">
        {(
          [
            ["vi", "Tiếng Việt"],
            ["en", "English"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            disabled={pending}
            onClick={() => pick(v)}
            className={`h-9 px-4 text-[13px] font-semibold disabled:opacity-60 ${
              lang === v ? "bg-bloom text-white" : "bg-white text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {err && <p className="text-[12px] text-sale mt-2">{err}</p>}
    </div>
  );
}
