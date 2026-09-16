"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminT, type AdminT } from "@/lib/admin-i18n";
import type { Locale } from "@/lib/i18n";
import { setLocaleAction } from "@/lib/actions";

const Ctx = createContext<{ locale: Locale; t: AdminT }>({
  locale: "vi",
  t: adminT("vi"),
});

export function AdminI18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <Ctx.Provider value={{ locale, t: adminT(locale) }}>{children}</Ctx.Provider>
  );
}

export function useAdminT() {
  return useContext(Ctx).t;
}
export function useAdminLocale() {
  return useContext(Ctx).locale;
}

/** Nút chuyển VI ⇄ KO ở sidebar admin. */
export function AdminLangToggle() {
  const locale = useAdminLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-1">
      {(["vi", "ko"] as const).map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await setLocaleAction(l);
              router.refresh();
            })
          }
          className={`px-2 py-1 rounded-md text-[11px] font-bold disabled:opacity-60 ${
            locale === l
              ? "bg-bloom text-white"
              : "bg-white border border-line text-muted"
          }`}
        >
          {l === "vi" ? "VI" : "한국어"}
        </button>
      ))}
    </div>
  );
}
