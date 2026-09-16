"use client";

import { useRef, useState } from "react";

/** Upload 1 file ảnh -> trả URL đã lưu. Ném lỗi nếu thất bại. */
export async function uploadImageFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Tải ảnh thất bại");
  return data.url as string;
}

/**
 * Ô tải ảnh cho admin: chọn file từ máy -> POST /api/admin/upload -> trả URL.
 * Bấm "dán URL" để nhập link ngoài thay vì upload.
 */
export function ImageUpload({
  value,
  onChange,
  tint = "#EFEBE3",
  size = 44,
}: {
  value: string;
  onChange: (url: string) => void;
  tint?: string;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [urlMode, setUrlMode] = useState(false);

  async function upload(file: File) {
    setErr(null);
    setBusy(true);
    try {
      onChange(await uploadImageFile(file));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Tải ảnh thất bại");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif,.avif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title={value ? "Đổi ảnh" : "Tải ảnh lên"}
        className="relative rounded-md overflow-hidden border border-line shrink-0 flex items-center justify-center text-[9px] text-muted-2 hover:border-bloom disabled:opacity-60"
        style={{ width: size, height: size, background: tint }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : busy ? (
          "…"
        ) : (
          <span className="text-base leading-none">＋</span>
        )}
      </button>

      <div className="flex flex-col gap-0.5 text-[10.5px]">
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-sale font-medium text-left"
          >
            Xoá ảnh
          </button>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="text-bloom font-semibold text-left disabled:opacity-60"
          >
            {busy ? "Đang tải…" : "Tải ảnh từ máy"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setUrlMode((s) => !s)}
          className="text-muted-2 underline text-left"
        >
          {urlMode ? "ẩn ô URL" : "hoặc dán URL"}
        </button>
        {urlMode && (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
            className="h-6 border border-line rounded px-1.5 text-[10.5px] w-40"
          />
        )}
        {err && <span className="text-sale">{err}</span>}
      </div>
    </div>
  );
}
