"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCartAction } from "@/lib/actions";
import { formatVND, discountPercent } from "@/lib/format";

type Variant = {
  id: string;
  name: string;
  price: number;
  salePrice: number | null;
  effPrice: number;
  effOriginal: number | null;
  stock: number;
};

export function PurchasePanel({
  variants,
  labels,
  showPrices = true,
}: {
  variants: Variant[];
  labels: {
    addToCart: string;
    buyNow: string;
    sizeLabel: string;
    inStock: string;
    outOfStock: string;
    priceHidden: string;
    priceHiddenHint: string;
  };
  showPrices?: boolean;
}) {
  const [selected, setSelected] = useState(variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const router = useRouter();

  const v = variants.find((x) => x.id === selected) ?? variants[0];
  if (!v) return null;

  function add(then?: "checkout") {
    startTransition(async () => {
      await addToCartAction(v.id, qty);
      setAdded(true);
      if (then === "checkout") router.push("/checkout");
      else router.refresh();
    });
  }

  return (
    <div>
      {showPrices ? (
        <>
          <div className="flex items-baseline gap-3 mt-5">
            <span className="text-3xl font-bold text-sale">
              {formatVND(v.effPrice)}
            </span>
            {v.effOriginal && (
              <>
                <span className="text-base text-muted-2 line-through">
                  {formatVND(v.effOriginal)}
                </span>
                <span className="text-xs font-bold text-sale bg-[#FBEAEA] px-2 py-1 rounded">
                  -{discountPercent(v.effOriginal, v.effPrice)}%
                </span>
              </>
            )}
          </div>
          <div className="text-[12.5px] text-muted mt-1">Giá đã bao gồm VAT</div>
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-line bg-[#FBFBFA] px-4 py-3.5">
          <div className="text-lg font-bold">{labels.priceHidden}</div>
          <div className="text-[12.5px] text-muted mt-1 leading-relaxed">
            {labels.priceHiddenHint}
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="text-[13px] font-semibold mb-2.5">{labels.sizeLabel}</div>
        <div className="flex flex-wrap gap-2.5">
          {variants.map((x) => (
            <button
              key={x.id}
              onClick={() => setSelected(x.id)}
              className={`px-4 py-2.5 rounded-lg text-[13.5px] font-semibold border ${
                x.id === selected
                  ? "border-[1.5px] border-bloom"
                  : "border-line text-[#555]"
              }`}
            >
              {x.name}
            </button>
          ))}
        </div>
      </div>

      {showPrices && (
      <div className="mt-5 flex items-center gap-4">
        <div className="text-[13px] font-semibold">Số lượng</div>
        <div className="flex items-center border border-line rounded-lg">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-10 h-[42px] text-lg text-muted"
          >
            −
          </button>
          <span className="w-11 text-center text-sm font-semibold">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(v.stock, q + 1))}
            className="w-10 h-[42px] text-lg text-muted"
          >
            +
          </button>
        </div>
        <span className="text-[12.5px] text-bloom">
          {v.stock > 0 ? `${labels.inStock}: ${v.stock}` : labels.outOfStock}
        </span>
      </div>
      )}

      {showPrices && (
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={() => add()}
            disabled={pending || v.stock <= 0}
            className="flex items-center justify-center h-[54px] rounded-lg border border-bloom font-semibold text-[15px] disabled:opacity-50"
          >
            {added ? "✓ Đã thêm" : labels.addToCart}
          </button>
          <button
            onClick={() => add("checkout")}
            disabled={pending || v.stock <= 0}
            className="flex items-center justify-center h-[54px] rounded-lg bg-bloom text-white hover:bg-bloom-ink font-semibold text-[15px] disabled:opacity-50"
          >
            {labels.buyNow}
          </button>
        </div>
      )}
    </div>
  );
}
