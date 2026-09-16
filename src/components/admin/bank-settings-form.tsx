"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBankInfoAction } from "@/lib/admin-actions";
import type { BankInfo } from "@/lib/settings";
import { useAdminT } from "./admin-i18n";

function qrPreview(b: BankInfo): string | null {
  if (!/^\d{6}$/.test(b.bankBin) || !b.account) return null;
  const p = new URLSearchParams({
    amount: "50000",
    addInfo: "OLxxxxx",
    accountName: b.holder,
  });
  return `https://img.vietqr.io/image/${b.bankBin}-${b.account}-compact2.png?${p}`;
}

export function BankSettingsForm({ bank }: { bank: BankInfo }) {
  const t = useAdminT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState<BankInfo>(bank);

  const set = (k: keyof BankInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const preview = qrPreview(form);

  return (
    <div className="bg-white border border-line rounded-card p-5 max-w-[560px]">
      <div className="text-[13px] font-bold mb-1">{t("settings.bank")}</div>
      <p className="text-[12px] text-muted-2 mb-4 leading-relaxed">
        {t("settings.bankHint")}
      </p>
      <form
        action={(fd) => {
          setMsg(null);
          start(async () => {
            const res = await updateBankInfoAction(fd);
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
        <F label={t("settings.bankName")} name="bankName" value={form.bankName} onChange={set("bankName")} />
        <F label={t("settings.bankBin")} name="bankBin" value={form.bankBin} onChange={set("bankBin")} placeholder="970436" />
        <F label={t("settings.account")} name="account" value={form.account} onChange={set("account")} />
        <F label={t("settings.holder")} name="holder" value={form.holder} onChange={set("holder")} />
        <div className="flex items-center gap-3 mt-1">
          <button
            disabled={pending}
            className="h-10 px-5 bg-bloom text-white hover:bg-bloom-ink rounded-lg text-[13px] font-semibold disabled:opacity-60"
          >
            {t("settings.save")}
          </button>
          {msg && (
            <span className={`text-[12px] ${msg.ok ? "text-success" : "text-sale"}`}>
              {msg.ok ? "✓ " : ""}
              {msg.text}
            </span>
          )}
        </div>
      </form>
      {preview && (
        <div className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="VietQR preview"
            width={180}
            height={250}
            className="w-[180px] rounded-lg border border-line"
          />
        </div>
      )}
    </div>
  );
}

function F({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-[#4A4A4A] mb-1 block">
        {label}
      </span>
      <input
        {...props}
        className="w-full h-10 border border-line rounded-lg px-3 text-[13px] outline-none focus:border-bloom"
      />
    </label>
  );
}
