"use client";

import { useAdminT } from "./admin-i18n";

export function AdminStub({ title, note }: { title: string; note?: string }) {
  const t = useAdminT();
  return (
    <div className="p-6 md:p-8">
      <h1 className="text-[22px] font-bold tracking-tight">{title}</h1>
      <div className="bg-white border border-line rounded-card p-10 mt-5 text-center">
        <p className="text-sm text-muted">{note ?? t("common.draftNote")}</p>
      </div>
    </div>
  );
}
