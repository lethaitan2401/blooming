"use client";

import Link from "next/link";
import { useState } from "react";
import { customerLogoutAction } from "@/lib/auth-actions";

function firstName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] || name;
}

export function AccountMenu({
  name,
  labels,
}: {
  name?: string | null;
  labels: { account: string; signIn: string; orders: string; profile: string; signOut: string };
}) {
  const [open, setOpen] = useState(false);

  if (!name) {
    return (
      <Link href="/login" className="flex flex-col items-center gap-[3px]">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </svg>
        <span className="text-[10.5px] text-muted">{labels.signIn}</span>
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex flex-col items-center gap-[3px]"
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </svg>
        <span className="text-[10.5px] text-muted max-w-[64px] truncate">
          {firstName(name)}
        </span>
      </button>

      {open && (
        <div className="absolute top-[46px] right-0 z-20 w-[180px] rounded-[10px] border border-line bg-white p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.12)]">
          <div className="px-2.5 py-2 text-[12px] text-muted-2 border-b border-line mb-1">
            {name}
          </div>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-2.5 py-2 rounded-[7px] text-[13px] hover:bg-surface"
          >
            {labels.profile}
          </Link>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-2.5 py-2 rounded-[7px] text-[13px] hover:bg-surface"
          >
            {labels.orders}
          </Link>
          <form action={customerLogoutAction}>
            <button className="w-full text-left px-2.5 py-2 rounded-[7px] text-[13px] text-sale hover:bg-surface">
              {labels.signOut}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
