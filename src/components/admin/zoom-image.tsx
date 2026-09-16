"use client";

import { useEffect, useState } from "react";

/**
 * Ảnh nhỏ trong admin — bấm để phóng to toàn màn hình. Không có ảnh thật thì
 * chỉ hiện ô tint, không bấm được.
 */
export function ZoomImage({
  src,
  alt,
  tint = "#EFEBE3",
  className = "w-9 h-9",
}: {
  src?: string | null;
  alt: string;
  tint?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const box = `${className} rounded-md overflow-hidden shrink-0 border border-[#F0F0EC] block`;

  if (!src) {
    return <span className={box} style={{ background: tint || "#EFEBE3" }} />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Phóng to: ${alt}`}
        className={`${box} cursor-zoom-in hover:opacity-80 transition-opacity p-0`}
        style={{ background: tint || "#EFEBE3" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Ảnh phóng to: ${alt}`}
          onClick={() => setOpen(false)}
          style={{ backgroundColor: "rgba(0, 0, 0, 0.9)" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 p-4 sm:p-8"
        >
          <button
            type="button"
            autoFocus
            aria-label="Đóng"
            onClick={() => setOpen(false)}
            style={{ backgroundColor: "rgba(255, 255, 255, 0.14)" }}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full text-white hover:brightness-150"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[82vh] max-w-full rounded-lg bg-white object-contain shadow-2xl"
          />
          <span
            style={{ backgroundColor: "rgba(255, 255, 255, 0.14)" }}
            className="max-w-[90vw] truncate rounded-full px-3 py-1 text-[12px] font-medium text-white"
          >
            {alt}
          </span>
        </div>
      )}
    </>
  );
}
