"use client";

import { useState } from "react";

/** Nút copy nhỏ cạnh giá trị (số TK, nội dung CK). */
export function CopyHint({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className="ml-2 text-[11px] font-semibold text-bloom align-middle"
    >
      {ok ? "✓ đã copy" : "copy"}
    </button>
  );
}
