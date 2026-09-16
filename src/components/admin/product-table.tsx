"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  updateVariantPriceAction,
  updateVariantStockAction,
  updateProductStatusAction,
  updateProductCategoryAction,
  toggleProductFlagAction,
  updateVariantCostKrwAction,
  updateVariantMarkupAction,
  updateKrwRateAction,
} from "@/lib/admin-actions";
import { formatVND } from "@/lib/format";
import { useAdminT } from "./admin-i18n";

export type Row = {
  productId: string;
  slug: string;
  name: string;
  nameEn: string | null;
  brand: string;
  category: string;
  categorySlug: string;
  sku: string;
  variantId: string;
  variantName: string;
  costKrw: number;
  cost: number | null; // giá vốn VND
  markupPct: number;
  price: number;
  salePrice: number | null;
  stock: number;
  status: "DRAFT" | "ACTIVE" | "HIDDEN";
  isBestSeller: boolean;
  isNew: boolean;
  pendingPrice: boolean;
};

export type Option = { slug: string; name: string };

const fmtKrw = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

const STATUS_LABEL: Record<Row["status"], { dot: string; bg: string }> = {
  ACTIVE: { dot: "#2E7D46", bg: "bg-[#E7F1FA] text-success" },
  HIDDEN: { dot: "#9A9A9A", bg: "bg-[#F0F0EC] text-muted" },
  DRAFT: { dot: "#B57A17", bg: "bg-[#FBF3E6] text-warning" },
};

export function ProductTable({
  rows,
  categories,
  canViewCost = false,
  krwRate = 18,
}: {
  rows: Row[];
  categories: Option[];
  canViewCost?: boolean;
  krwRate?: number;
}) {
  const [pending, startTransition] = useTransition();
  const t = useAdminT();
  const [flash, setFlash] = useState<string | null>(null);
  const [rate, setRate] = useState(String(krwRate));
  const colCount = canViewCost ? 11 : 9;

  function notify(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3500);
  }

  // Nhóm theo danh mục (rows đã được server sắp xếp theo danh mục)
  const groups: { category: string; rows: Row[] }[] = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last && last.category === r.category) last.rows.push(r);
    else groups.push({ category: r.category, rows: [r] });
  }

  return (
    <>
      {flash && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-white text-[13px] px-4 py-2.5 rounded-lg shadow-lg">
          {flash}
        </div>
      )}

      {canViewCost && (
        <div className="mb-3 bg-white border border-line rounded-card px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-[13px] font-semibold">{t("products.rateBar")}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[12.5px] text-muted">1 ₩ =</span>
            <input
              value={rate}
              onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ""))}
              className="w-20 h-8 border border-line rounded-md px-2 text-[13px] text-right font-semibold"
            />
            <span className="text-[12.5px] text-muted">₫</span>
          </div>
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await updateKrwRateAction(Number(rate));
                notify(
                  res.ok
                    ? `${t("products.rateSet")} ${rate}₫/₩ · ${res.updated} ${t("products.recalcDone")}`
                    : t("products.rateInvalid"),
                );
              })
            }
            className="h-8 px-3 bg-bloom text-white hover:bg-bloom-ink rounded-md text-[12px] font-semibold disabled:opacity-60"
          >
            {t("products.recalcBtn")}
          </button>
          <span className="text-[11.5px] text-muted-2">
            {t("products.rateBarHint")}
          </span>
        </div>
      )}

      <div className="bg-white border border-line rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-wide text-muted-2 text-left">
                <th className="px-3 py-3 border-b border-[#F0F0EC]">Tên (VI)</th>
                <th className="px-3 py-3 border-b border-[#F0F0EC]">Tên (EN)</th>
                <th className="px-3 py-3 border-b border-[#F0F0EC]">{t("products.category")}</th>
                <th className="px-3 py-3 border-b border-[#F0F0EC]">SKU</th>
                {canViewCost && (
                  <>
                    <th className="px-3 py-3 border-b border-[#F0F0EC]">
                      {t("products.costKrw")}
                    </th>
                    <th className="px-3 py-3 border-b border-[#F0F0EC]">{t("products.markup")}</th>
                  </>
                )}
                <th className="px-3 py-3 border-b border-[#F0F0EC]">{t("products.sellPrice")}</th>
                <th className="px-3 py-3 border-b border-[#F0F0EC]">{t("products.salePrice")}</th>
                <th className="px-3 py-3 border-b border-[#F0F0EC]">{t("products.stock")}</th>
                <th className="px-3 py-3 border-b border-[#F0F0EC]">{t("orders.status")}</th>
                <th className="px-3 py-3 border-b border-[#F0F0EC]" />
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.category}>
                <tr>
                  <td
                    colSpan={colCount}
                    className="bg-surface px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted border-y border-[#ECECE8]"
                  >
                    {g.category}{" "}
                    <span className="text-muted-2 font-medium normal-case">
                      · {g.rows.length} {t("products.variantCount")}
                    </span>
                  </td>
                </tr>
                {g.rows.map((r) => (
                  <tr key={r.variantId} className="border-b border-[#F4F4F0]">
                  <td className="px-3 py-2.5 align-top max-w-[260px]">
                    <div className="text-[13px] font-medium leading-tight">
                      {r.name}
                    </div>
                    <div className="text-[11px] text-muted-2">
                      {r.brand} · {r.variantName}
                    </div>
                    <div className="flex gap-1.5 mt-1.5">
                      <FlagChip
                        label={t("products.bestSeller")}
                        on={r.isBestSeller}
                        disabled={pending}
                        onToggle={() =>
                          startTransition(async () => {
                            const res = await toggleProductFlagAction(
                              r.productId,
                              "best",
                              !r.isBestSeller,
                            );
                            notify(
                              res.ok
                                ? r.isBestSeller
                                  ? t("products.removedBest")
                                  : t("products.addedBest")
                                : t("common.noPermission"),
                            );
                          })
                        }
                      />
                      <FlagChip
                        label={t("products.isNew")}
                        on={r.isNew}
                        disabled={pending}
                        onToggle={() =>
                          startTransition(async () => {
                            const res = await toggleProductFlagAction(
                              r.productId,
                              "new",
                              !r.isNew,
                            );
                            notify(
                              res.ok
                                ? r.isNew
                                  ? t("products.removedNew")
                                  : t("products.addedNew")
                                : t("common.noPermission"),
                            );
                          })
                        }
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-top text-[12px] text-muted leading-tight max-w-[240px]">
                    {r.nameEn || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={r.categorySlug}
                      disabled={pending}
                      onChange={(e) =>
                        startTransition(async () => {
                          const res = await updateProductCategoryAction(
                            r.productId,
                            e.target.value,
                          );
                          notify(
                            res.ok
                              ? t("products.categoryChanged")
                              : t("products.noCatRight"),
                          );
                        })
                      }
                      className="text-[12px] px-2 py-1.5 rounded-md border border-line bg-white outline-none max-w-[150px]"
                    >
                      {categories.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-muted">{r.sku}</td>
                  {canViewCost && (
                    <>
                      <td className="px-3 py-2.5">
                        <CostKrwCell
                          krw={r.costKrw}
                          vnd={r.cost ?? 0}
                          price={r.price}
                          rate={Number(rate) || krwRate}
                          pending={pending}
                          onSave={(v) =>
                            startTransition(async () => {
                              const res = await updateVariantCostKrwAction(
                                r.variantId,
                                v,
                              );
                              notify(
                                res.ok
                                  ? `Giá vốn ${formatVND(res.costPrice ?? 0)} · giá bán → ${formatVND(res.price ?? 0)}`
                                  : t("products.noCostRight"),
                              );
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <MarkupCell
                          pct={r.markupPct}
                          cost={r.cost ?? 0}
                          pending={pending}
                          onSave={(p) =>
                            startTransition(async () => {
                              const res = await updateVariantMarkupAction(
                                r.variantId,
                                p,
                              );
                              notify(
                                res.ok
                                  ? `Lãi ${p}% · giá bán → ${formatVND(res.price ?? 0)}`
                                  : t("common.noPermission"),
                              );
                            })
                          }
                        />
                      </td>
                    </>
                  )}
                  <td className="px-3 py-2.5">
                    <EditableMoney
                      value={r.price}
                      pending={pending}
                      onSave={(v) =>
                        startTransition(async () => {
                          const res = await updateVariantPriceAction(
                            r.variantId,
                            "PRICE",
                            v,
                          );
                          notify(
                            res.status === "applied"
                              ? t("products.priceUpdated")
                              : res.status === "pending"
                                ? t("products.priceRequestSent")
                                : t("products.noPriceRight"),
                          );
                        })
                      }
                    />
                    {r.pendingPrice && (
                      <div className="text-[10px] text-warning bg-[#FBF3E6] inline-block px-1.5 py-0.5 rounded mt-1">
                        có thay đổi chờ duyệt
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <EditableMoney
                      value={r.salePrice}
                      placeholder="—"
                      pending={pending}
                      onSave={(v) =>
                        startTransition(async () => {
                          const res = await updateVariantPriceAction(
                            r.variantId,
                            "SALE_PRICE",
                            v,
                          );
                          notify(
                            res.status === "applied"
                              ? t("products.salePriceUpdated")
                              : res.status === "pending"
                                ? t("products.priceRequestSent")
                                : t("common.noPermission"),
                          );
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <EditableNumber
                      value={r.stock}
                      pending={pending}
                      onSave={(v) =>
                        startTransition(async () => {
                          const res = await updateVariantStockAction(
                            r.variantId,
                            v,
                          );
                          notify(res.ok ? t("products.stockUpdated") : t("common.noPermission"));
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusSelect
                      value={r.status}
                      onChange={(s) =>
                        startTransition(async () => {
                          const res = await updateProductStatusAction(
                            r.productId,
                            s,
                          );
                          notify(res.ok ? t("products.statusChanged") : t("common.noPermission"));
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/products/${r.productId}/edit`}
                      className="text-[11.5px] font-semibold text-bloom hover:text-bloom-ink"
                    >
                      {t("common.edit")}
                    </Link>
                    <Link
                      href={`/product/${r.slug}`}
                      target="_blank"
                      className="text-[11.5px] text-muted-2 hover:text-bloom ml-3"
                    >
                      {t("products.view")}
                    </Link>
                  </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </div>
    </>
  );
}

function MarkupCell({
  pct,
  cost,
  onSave,
  pending,
}: {
  pct: number;
  cost: number;
  onSave: (p: number) => void;
  pending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const livePct = editing && draft !== "" ? Number(draft) : pct;
  const preview =
    cost > 0
      ? Math.round((cost * (100 + livePct)) / 100 / 1000) * 1000
      : 0;

  return (
    <div className="min-w-[86px]">
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSave(draft === "" ? 0 : Number(draft));
              setEditing(false);
            }
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={() => setEditing(false)}
          disabled={pending}
          className="h-8 w-[54px] border-[1.5px] border-bloom rounded-md px-2 text-[12.5px] font-semibold outline-none text-right"
        />
      ) : (
        <button
          onClick={() => {
            setDraft(String(pct));
            setEditing(true);
          }}
          className="text-[12.5px] font-semibold border-b border-dashed border-[#C9C9C2] pb-px"
        >
          {pct}%
        </button>
      )}
      {preview > 0 && (
        <div className="text-[10.5px] text-muted-2 mt-0.5">→ {formatVND(preview)}</div>
      )}
    </div>
  );
}

function CostKrwCell({
  krw,
  vnd,
  price,
  rate,
  onSave,
  pending,
}: {
  krw: number;
  vnd: number;
  price: number;
  rate: number;
  onSave: (v: number) => void;
  pending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const liveVnd = editing && draft !== "" ? Math.round(Number(draft) * rate) : vnd;
  const margin =
    price > 0 ? Math.round(((price - liveVnd) / price) * 100) : 0;

  return (
    <div className="min-w-[130px]">
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSave(draft === "" ? 0 : Number(draft));
              setEditing(false);
            }
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={() => setEditing(false)}
          disabled={pending}
          placeholder="₩"
          className="h-8 w-[96px] border-[1.5px] border-bloom rounded-md px-2 text-[12.5px] font-semibold outline-none text-right"
        />
      ) : (
        <button
          onClick={() => {
            setDraft(krw ? String(krw) : "");
            setEditing(true);
          }}
          className="text-[12.5px] font-semibold border-b border-dashed border-[#C9C9C2] pb-px"
        >
          {krw ? fmtKrw(krw) : "₩ —"}
        </button>
      )}
      <div className="text-[11px] text-muted-2 mt-0.5">
        = {formatVND(liveVnd)}
        <span
          className={`ml-1.5 font-semibold ${
            margin < 15 ? "text-sale" : "text-success"
          }`}
        >
          lãi {margin}%
        </span>
      </div>
    </div>
  );
}

function EditableMoney({
  value,
  onSave,
  pending,
  placeholder = "0",
}: {
  value: number | null;
  onSave: (v: number | null) => void;
  pending: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (!editing) {
    return (
      <button
        onClick={() => {
          setDraft(value != null ? String(value) : "");
          setEditing(true);
        }}
        className="text-[12.5px] border-b border-dashed border-[#C9C9C2] pb-px"
      >
        {value != null ? formatVND(value) : placeholder}
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSave(draft === "" ? null : Number(draft));
            setEditing(false);
          }
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={() => setEditing(false)}
        disabled={pending}
        className="h-8 w-[92px] border-[1.5px] border-bloom rounded-md px-2 text-[12.5px] font-semibold outline-none"
      />
    </span>
  );
}

function EditableNumber({
  value,
  onSave,
  pending,
}: {
  value: number;
  onSave: (v: number) => void;
  pending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  if (!editing) {
    return (
      <button
        onClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
        className="text-[12.5px] border-b border-dashed border-[#C9C9C2] pb-px"
      >
        {value}
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onSave(Number(draft || 0));
          setEditing(false);
        }
        if (e.key === "Escape") setEditing(false);
      }}
      onBlur={() => setEditing(false)}
      disabled={pending}
      className="h-8 w-[56px] border-[1.5px] border-bloom rounded-md px-2 text-[12.5px] font-semibold outline-none"
    />
  );
}

function FlagChip({
  label,
  on,
  disabled,
  onToggle,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border transition-colors disabled:opacity-60 ${
        on
          ? "bg-bloom text-white border-bloom"
          : "bg-white text-muted-2 border-line hover:border-bloom"
      }`}
    >
      {on ? "✓ " : "+ "}
      {label}
    </button>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: Row["status"];
  onChange: (s: Row["status"]) => void;
}) {
  const t = useAdminT();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Row["status"])}
      className={`text-[11.5px] font-semibold px-2 py-1 rounded-full border-0 outline-none appearance-none cursor-pointer ${STATUS_LABEL[value].bg}`}
    >
      <option value="ACTIVE">{t("products.active")}</option>
      <option value="HIDDEN">{t("products.hidden")}</option>
      <option value="DRAFT">{t("products.draft")}</option>
    </select>
  );
}
