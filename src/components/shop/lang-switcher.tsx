"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { setLocaleAction } from "@/lib/actions";

const LABELS: Record<Locale, string> = { vi: "Tiếng Việt", ko: "한국어" };

export function LangSwitcher({ current }: { current: Locale }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function choose(loc: Locale) {
    setOpen(false);
    startTransition(async () => {
      await setLocaleAction(loc);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex flex-col items-center gap-[3px]"
        aria-label="Language"
        disabled={pending}
      >
        <span className="flex items-center gap-1">
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3c2.6 2.8 2.6 15.2 0 18M12 3c-2.6 2.8-2.6 15.2 0 18" />
          </svg>
          <b className="text-xs">{current.toUpperCase()}</b>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6B6B6B"
            strokeWidth="2.6"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
        <span className="text-[10.5px] text-muted">
          {current === "ko" ? "언어" : "Ngôn ngữ"}
        </span>
      </button>

      {open && (
        <div className="absolute top-[46px] right-0 z-20 w-[156px] rounded-[10px] border border-line bg-white p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.12)]">
          {(["vi", "ko"] as Locale[]).map((loc) => (
            <button
              key={loc}
              onClick={() => choose(loc)}
              className={`flex w-full items-center justify-between rounded-[7px] px-2.5 py-2 text-[13px] ${
                loc === current ? "bg-surface font-semibold" : ""
              }`}
            >
              {LABELS[loc]}
              {loc === current && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1D6FA5"
                  strokeWidth="2.4"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
