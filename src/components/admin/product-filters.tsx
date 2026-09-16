"use client";

import { useRouter } from "next/navigation";
import { useAdminT } from "./admin-i18n";

export function AdminProductFilters({
  categories,
  brands,
  current,
}: {
  categories: { slug: string; name: string }[];
  brands: { slug: string; name: string }[];
  current: { category?: string; brand?: string; q?: string };
}) {
  const router = useRouter();
  const t = useAdminT();

  function go(patch: Record<string, string>) {
    const p = new URLSearchParams();
    const merged = { ...current, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    router.push(`/admin/products${p.toString() ? `?${p}` : ""}`);
  }

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      <input
        defaultValue={current.q ?? ""}
        onKeyDown={(e) => {
          if (e.key === "Enter") go({ q: (e.target as HTMLInputElement).value });
        }}
        placeholder={t("products.searchPlaceholder")}
        className="h-9 flex-1 min-w-[200px] border border-line rounded-lg px-3 text-[13px] outline-none focus:border-bloom bg-white"
      />
      <select
        value={current.category ?? ""}
        onChange={(e) => go({ category: e.target.value })}
        className="h-9 border border-line rounded-lg px-3 text-[13px] bg-white outline-none"
      >
        <option value="">{t("products.allCategories")}</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={current.brand ?? ""}
        onChange={(e) => go({ brand: e.target.value })}
        className="h-9 border border-line rounded-lg px-3 text-[13px] bg-white outline-none"
      >
        <option value="">{t("products.allBrands")}</option>
        {brands.map((b) => (
          <option key={b.slug} value={b.slug}>
            {b.name}
          </option>
        ))}
      </select>
      {(current.category || current.brand || current.q) && (
        <button
          onClick={() => router.push("/admin/products")}
          className="h-9 px-3 text-[13px] text-muted hover:text-foreground"
        >
          {t("products.clearFilter")}
        </button>
      )}
    </div>
  );
}
