"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductImageBox } from "./product-image-box";

type Img = { id: string; url: string | null; tint: string };

/**
 * Thư viện ảnh sản phẩm ở trang chi tiết: bấm thumbnail để đổi ảnh lớn,
 * bấm ảnh lớn để phóng to xem toàn màn hình.
 */
export function ProductGallery({
  images,
  name,
}: {
  images: Img[];
  name: string;
}) {
  const list: Img[] = images.length
    ? images
    : [{ id: "placeholder", url: null, tint: "#EFEBE3" }];
  const [active, setActive] = useState(0);
  const idx = Math.min(active, list.length - 1);
  const cur = list[idx];
  const [zoom, setZoom] = useState(false);
  const canZoom = !!cur.url;

  const step = useCallback(
    (d: number) => setActive((i) => (i + d + list.length) % list.length),
    [list.length],
  );

  useEffect(() => {
    if (!zoom) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [zoom, step]);

  return (
    <div className="flex gap-4">
      {list.length > 1 && (
        <div className="flex flex-col gap-2.5">
          {list.map((img, i) => (
            <button
              key={img.id}
              type="button"
              aria-label={`Xem ảnh ${i + 1}`}
              aria-pressed={i === idx}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              className={`relative w-[70px] h-[70px] rounded-lg shrink-0 overflow-hidden transition-shadow ${
                i === idx
                  ? "ring-2 ring-bloom"
                  : "border border-line hover:border-bloom"
              }`}
            >
              <ProductImageBox
                url={img.url}
                tint={img.tint}
                alt={`${name} ${i + 1}`}
                iconSize={22}
                sizes="70px"
                className="w-full h-full"
              />
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => canZoom && setZoom(true)}
        aria-label={canZoom ? "Phóng to ảnh" : undefined}
        className={`group relative flex-1 aspect-square rounded-xl overflow-hidden ${
          canZoom ? "cursor-zoom-in" : "cursor-default"
        }`}
      >
        <ProductImageBox
          key={cur.id}
          url={cur.url}
          tint={cur.tint}
          alt={name}
          iconSize={120}
          sizes="(max-width: 768px) 90vw, 480px"
          priority
          className="w-full h-full"
        />
        {canZoom && (
          <span
            style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
            className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11.5px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3M11 8v6M8 11h6" />
            </svg>
            Phóng to
          </span>
        )}
      </button>

      {zoom && cur.url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Ảnh phóng to: ${name}`}
          onClick={() => setZoom(false)}
          style={{ backgroundColor: "rgba(0, 0, 0, 0.9)" }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
        >
          <button
            type="button"
            autoFocus
            aria-label="Đóng"
            onClick={() => setZoom(false)}
            style={{ backgroundColor: "rgba(255, 255, 255, 0.14)" }}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full text-white hover:brightness-150"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          {list.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Ảnh trước"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                style={{ backgroundColor: "rgba(255, 255, 255, 0.14)" }}
                className="absolute left-3 sm:left-6 flex h-11 w-11 items-center justify-center rounded-full text-white hover:brightness-150"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Ảnh sau"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                style={{ backgroundColor: "rgba(255, 255, 255, 0.14)" }}
                className="absolute right-3 sm:right-6 flex h-11 w-11 items-center justify-center rounded-full text-white hover:brightness-150"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cur.url}
            alt={name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-full rounded-lg object-contain shadow-2xl"
          />

          {list.length > 1 && (
            <span
              style={{ backgroundColor: "rgba(255, 255, 255, 0.14)" }}
              className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[12px] font-medium text-white"
            >
              {idx + 1} / {list.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
