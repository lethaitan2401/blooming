"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { createProductAction, updateProductAction } from "@/lib/product-actions";
import { formatVND } from "@/lib/format";
import { useAdminT } from "./admin-i18n";
import { uploadImageFile } from "./image-upload";

export type FormVariant = {
  id?: string;
  name: string;
  sku: string;
  costKrw: number;
  price: number;
  salePrice: number | null;
  stock: number;
  locked?: boolean; // có đơn hàng -> không xoá
  pendingPrice?: boolean;
};
export type FormImage = { url: string; tint: string };

export type FormProduct = {
  id?: string;
  name: string;
  nameEn: string;
  nameKo: string;
  slug: string;
  description: string;
  ingredients: string;
  howToUse: string;
  origin: string;
  metaTitle: string;
  metaDescription: string;
  orderType: "INSTOCK" | "PREORDER";
  status: "ACTIVE" | "DRAFT" | "HIDDEN";
  isBestSeller: boolean;
  isNew: boolean;
  brandId: string;
  categoryId: string;
  images: FormImage[];
  variants: FormVariant[];
};

type Option = { id: string; name: string; parentId?: string | null };

const TINTS = ["#EFEBE3", "#E9ECE8", "#F0E7E7", "#E7EAEE", "#F0E3E3", "#ECE9F0"];

const empty: FormProduct = {
  name: "",
  nameEn: "",
  nameKo: "",
  slug: "",
  description: "",
  ingredients: "",
  howToUse: "",
  origin: "Hàn Quốc",
  metaTitle: "",
  metaDescription: "",
  orderType: "INSTOCK",
  status: "ACTIVE",
  isBestSeller: false,
  isNew: false,
  brandId: "",
  categoryId: "",
  images: [],
  variants: [{ name: "Tiêu chuẩn", sku: "", costKrw: 0, price: 0, salePrice: null, stock: 0 }],
};

export function ProductForm({
  mode,
  product,
  brands,
  categories,
  canApprove,
  canCost,
  krwRate,
  priceHistory = [],
  presetBrandId,
  presetCategoryId,
}: {
  mode: "create" | "edit";
  product?: FormProduct;
  brands: Option[];
  categories: Option[];
  canApprove: boolean;
  canCost: boolean;
  krwRate: number;
  priceHistory?: { label: string; by: string; at: string }[];
  presetBrandId?: string;
  presetCategoryId?: string;
}) {
  const t = useAdminT();
  const init =
    product ??
    (mode === "create"
      ? { ...empty, brandId: presetBrandId ?? "", categoryId: presetCategoryId ?? "" }
      : empty);
  const formRef = useRef<HTMLFormElement>(null);

  const [name, setName] = useState(init.name);
  const [nameEn, setNameEn] = useState(init.nameEn);
  const [nameKo, setNameKo] = useState(init.nameKo);
  const [slug, setSlug] = useState(init.slug);
  const [description, setDescription] = useState(init.description);
  const [ingredients, setIngredients] = useState(init.ingredients);
  const [howToUse, setHowToUse] = useState(init.howToUse);
  const [origin, setOrigin] = useState(init.origin);
  const [metaTitle, setMetaTitle] = useState(init.metaTitle);
  const [metaDescription, setMetaDescription] = useState(init.metaDescription);
  const [orderType, setOrderType] = useState(init.orderType);
  const [status, setStatus] = useState(init.status);
  const [isBestSeller, setIsBestSeller] = useState(init.isBestSeller);
  const [isNew, setIsNew] = useState(init.isNew);
  const [brandId, setBrandId] = useState(init.brandId);
  const [newBrandName, setNewBrandName] = useState("");
  const [categoryId, setCategoryId] = useState(init.categoryId);
  const [images, setImages] = useState<FormImage[]>(init.images);
  const [variants, setVariants] = useState<FormVariant[]>(
    init.variants.length ? init.variants : empty.variants,
  );

  const imgFileRef = useRef<HTMLInputElement>(null);
  const imgTargetRef = useRef<number>(-1); // -1 = thêm ảnh mới
  const [imgBusy, setImgBusy] = useState(false);

  async function handleImgFile(file: File) {
    setImgBusy(true);
    try {
      const url = await uploadImageFile(file);
      const target = imgTargetRef.current;
      setImages((L) =>
        target < 0 || target >= L.length
          ? [...L, { url, tint: "#EFEBE3" }]
          : L.map((x, idx) => (idx === target ? { ...x, url } : x)),
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : t("products.uploadFailed"));
    } finally {
      setImgBusy(false);
      if (imgFileRef.current) imgFileRef.current.value = "";
    }
  }

  function pickImage(target: number) {
    imgTargetRef.current = target;
    imgFileRef.current?.click();
  }

  const brandNew = brandId === "__new__";

  const v0 = variants[0];
  const v0cost = v0 && v0.costKrw > 0 ? Math.round(v0.costKrw * krwRate) : 0;
  const margin = useMemo(() => {
    if (!v0 || v0.price <= 0 || v0cost <= 0) return null;
    const base = v0.salePrice && v0.salePrice > 0 ? v0.salePrice : v0.price;
    return Math.round(((base - v0cost) / base) * 100);
  }, [v0, v0cost]);

  const autoSlug =
    slug.trim() ||
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

  function setV(i: number, patch: Partial<FormVariant>) {
    setVariants((L) => L.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }

  function submitAs(next?: FormProduct["status"]) {
    if (next) setStatus(next);
    // đợi state cập nhật xong rồi submit
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  const action = mode === "create" ? createProductAction : updateProductAction;

  return (
    <form ref={formRef} action={action}>
      {/* payload ẩn */}
      {mode === "edit" && <input type="hidden" name="productId" value={product!.id} />}
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="nameEn" value={nameEn} />
      <input type="hidden" name="nameKo" value={nameKo} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="ingredients" value={ingredients} />
      <input type="hidden" name="howToUse" value={howToUse} />
      <input type="hidden" name="origin" value={origin} />
      <input type="hidden" name="metaTitle" value={metaTitle} />
      <input type="hidden" name="metaDescription" value={metaDescription} />
      <input type="hidden" name="orderType" value={orderType} />
      <input type="hidden" name="status" value={status} />
      {isBestSeller && <input type="hidden" name="isBestSeller" value="on" />}
      {isNew && <input type="hidden" name="isNew" value="on" />}
      <input type="hidden" name="brandId" value={brandNew ? "" : brandId} />
      <input type="hidden" name="newBrandName" value={brandNew ? newBrandName : ""} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input
        type="hidden"
        name="variants"
        value={JSON.stringify(
          variants.map((v) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            costKrw: v.costKrw,
            price: v.price,
            salePrice: v.salePrice,
            stock: v.stock,
          })),
        )}
      />

      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-[12px] text-muted-2">
            <Link href="/admin/products" className="hover:text-bloom">
              Sản phẩm
            </Link>{" "}
            /{" "}
            <span className="text-foreground">
              {mode === "create" ? t("products.add") : t("products.edit")}
            </span>
          </div>
          <h1 className="text-[21px] font-bold tracking-tight mt-1.5 mb-1.5">
            {name || t("dash.newProducts")}
          </h1>
          <StatusBadge status={status} canApprove={canApprove} />
        </div>
        {mode === "edit" && (
          <Link
            href={`/product/${product!.slug}`}
            target="_blank"
            className="h-9 px-4 bg-white border border-line rounded-lg text-[13px] font-medium flex items-center shrink-0"
          >
            {t("products.view")}
          </Link>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
      {/* ---------------- CỘT TRÁI ---------------- */}
      <div className="flex flex-col gap-4.5 min-w-0">

        {/* Thông tin cơ bản */}
        <Card title={t("products.basicInfo")}>
          <Label>{t("products.name")} (VI)</Label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Serum Torriden DIVE-IN 50ml"
            className="inp"
          />
          <div className="mt-3.5">
            <Label>{t("products.nameEn")}</Label>
          </div>
          <input
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="VD: Torriden DIVE-IN Serum 50ml"
            className="inp"
          />
          <div className="grid sm:grid-cols-2 gap-3.5 mt-3.5">
            <div>
              <Label>{t("products.brand")}</Label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="inp"
              >
                <option value="">{t("products.chooseBrand")}</option>
                <optgroup label={t("products.brandsAvailable").replace("%s", String(brands.length))}>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </optgroup>
                <option value="__new__">{t("products.addNewBrand")}</option>
              </select>
              {brandNew ? (
                <input
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder={t("products.newBrand")}
                  className="inp mt-2"
                />
              ) : (
                <p className="text-[11px] text-muted-2 mt-1.5">{t("products.brandHelp")}</p>
              )}
            </div>
            <div>
              <Label>{t("products.category")}</Label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="inp"
              >
                <option value="">{t("products.chooseCategory")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? "› " : ""}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3.5">
            <Label>{t("products.description")}</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="inp !h-auto py-3 leading-relaxed"
              placeholder={t("form.descPlaceholder")}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3.5 mt-3.5">
            <div>
              <Label>{t("products.ingredients")}</Label>
              <textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                rows={3}
                className="inp !h-auto py-2.5 text-[12px] leading-relaxed"
              />
            </div>
            <div>
              <Label>{t("products.howToUse")}</Label>
              <textarea
                value={howToUse}
                onChange={(e) => setHowToUse(e.target.value)}
                rows={3}
                className="inp !h-auto py-2.5 text-[12px] leading-relaxed"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3.5 mt-3.5">
            <div>
              <Label>{t("products.origin")}</Label>
              <input value={origin} onChange={(e) => setOrigin(e.target.value)} className="inp" />
            </div>
            <div>
              <Label>{t("products.nameKo")}</Label>
              <input value={nameKo} onChange={(e) => setNameKo(e.target.value)} className="inp" />
            </div>
          </div>
        </Card>

        {/* Hình ảnh */}
        <Card title={t("products.images")}>
          <input
            ref={imgFileRef}
            type="file"
            accept="image/*,.heic,.heif,.avif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImgFile(f);
            }}
          />
          <div className="flex gap-3 flex-wrap">
            {images.map((im, i) => (
              <div key={i} className="w-[110px]">
                <div
                  className="w-[110px] h-[110px] rounded-[10px] relative overflow-hidden border border-line"
                  style={{ background: im.tint }}
                >
                  {im.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={im.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => pickImage(i)}
                      className="absolute inset-0 grid place-items-center text-[10px] text-muted-2 hover:text-bloom"
                    >
                      {t("products.addImage")}
                    </button>
                  )}
                  {i === 0 && (
                    <span className="absolute top-1.5 left-1.5 bg-bloom text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
                      {t("products.coverImage")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setImages((L) => L.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 bg-white/90 text-sale w-5 h-5 rounded text-[11px] leading-none"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => pickImage(i)}
                    disabled={imgBusy}
                    className="text-[10.5px] text-bloom font-semibold disabled:opacity-60"
                  >
                    {imgBusy
                      ? t("common.loading")
                      : im.url
                        ? t("products.changeImage")
                        : t("products.uploadImage")}
                  </button>
                </div>
                <input
                  value={im.url}
                  onChange={(e) =>
                    setImages((L) => L.map((x, idx) => (idx === i ? { ...x, url: e.target.value } : x)))
                  }
                  placeholder={t("products.orDropUrl")}
                  className="w-full h-7 border border-line rounded-md px-1.5 text-[10.5px] mt-1"
                />
                <div className="flex gap-1 mt-1">
                  {TINTS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setImages((L) => L.map((x, idx) => (idx === i ? { ...x, tint: t } : x)))
                      }
                      style={{ background: t }}
                      className={`w-4 h-4 rounded-full border ${
                        im.tint === t ? "border-bloom" : "border-line"
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => pickImage(-1)}
              disabled={imgBusy}
              className="w-[110px] h-[110px] border-[1.5px] border-dashed border-[#D0D0CA] rounded-[10px] flex flex-col items-center justify-center gap-1.5 text-muted-2 text-[11px] hover:border-bloom disabled:opacity-60"
            >
              <span className="text-lg leading-none">↑</span>
              {imgBusy ? t("common.loading") : t("products.uploadImage")}
            </button>
          </div>
          <p className="text-[11.5px] text-muted-2 mt-3">{t("products.uploadHelp")}</p>
        </Card>

        {/* Biến thể & giá */}
        <Card
          title={t("products.variantsPrice")}
          right={
            !canApprove ? (
              <span className="text-[11px] text-warning bg-[#FBF3E6] px-2 py-0.5 rounded-full">
                {t("products.priceNeedsApproval")}
              </span>
            ) : undefined
          }
        >
          <div className="overflow-x-auto -mx-1">
            <table className="w-full border-collapse min-w-[560px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-muted-2 text-left">
                  <th className="px-1.5 pb-2">{t("products.variantColumn")}</th>
                  <th className="px-1.5 pb-2">SKU</th>
                  {canCost && <th className="px-1.5 pb-2">{t("products.costKrwCol")}</th>}
                  <th className="px-1.5 pb-2">{t("products.sellPrice")} ₫</th>
                  <th className="px-1.5 pb-2">{t("products.salePrice")} ₫</th>
                  <th className="px-1.5 pb-2">{t("products.stock")}</th>
                  <th className="px-1.5 pb-2" />
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={v.id ?? `n${i}`} className="border-t border-[#F0F0EC]">
                    <td className="px-1.5 py-1.5">
                      <input
                        value={v.name}
                        onChange={(e) => setV(i, { name: e.target.value })}
                        className="cell"
                        placeholder="50ml"
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        value={v.sku}
                        onChange={(e) => setV(i, { sku: e.target.value })}
                        disabled={!!v.id}
                        className="cell disabled:bg-surface disabled:text-muted-2"
                        placeholder={t("products.autoSku")}
                      />
                    </td>
                    {canCost && (
                      <td className="px-1.5 py-1.5">
                        <input
                          inputMode="numeric"
                          value={v.costKrw || ""}
                          onChange={(e) =>
                            setV(i, { costKrw: Math.max(0, +e.target.value.replace(/\D/g, "") || 0) })
                          }
                          className="cell text-right"
                          placeholder="₩"
                        />
                      </td>
                    )}
                    <td className="px-1.5 py-1.5">
                      <input
                        inputMode="numeric"
                        value={v.price || ""}
                        onChange={(e) =>
                          setV(i, { price: Math.max(0, +e.target.value.replace(/\D/g, "") || 0) })
                        }
                        className={`cell text-right ${v.pendingPrice ? "border-warning bg-[#FEFBF4]" : ""}`}
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        inputMode="numeric"
                        value={v.salePrice ?? ""}
                        onChange={(e) => {
                          const s = e.target.value.replace(/\D/g, "");
                          setV(i, { salePrice: s === "" ? null : Math.max(0, +s) });
                        }}
                        className="cell text-right"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <input
                        inputMode="numeric"
                        value={v.stock || ""}
                        onChange={(e) =>
                          setV(i, { stock: Math.max(0, +e.target.value.replace(/\D/g, "") || 0) })
                        }
                        className="cell text-right w-16"
                      />
                    </td>
                    <td className="px-1.5 py-1.5 text-center">
                      {variants.length > 1 && !v.locked && (
                        <button
                          type="button"
                          onClick={() => setVariants((L) => L.filter((_, idx) => idx !== i))}
                          className="text-muted-2 hover:text-sale text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() =>
              setVariants((L) => [
                ...L,
                { name: "", sku: "", costKrw: 0, price: 0, salePrice: null, stock: 0 },
              ])
            }
            className="text-[12.5px] text-bloom font-semibold mt-3"
          >
            {t("products.addVariant")}
          </button>
          {canCost && v0 && v0cost > 0 && (
            <p className="text-[11.5px] text-muted-2 mt-2">
              {t("products.costFirstVariantNote")
                .replace("%s", formatVND(v0cost))
                .replace("%s", v0.costKrw.toLocaleString("ko-KR"))
                .replace("%s", String(krwRate))}
            </p>
          )}
        </Card>

        {/* SEO */}
        <Card title="SEO">
          <Label>{t("products.slugLabel")}</Label>
          <div className="inp !text-muted">
            /product/
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={autoSlug || "tu-dong-tu-ten"}
              className="flex-1 outline-none bg-transparent text-foreground ml-0.5"
            />
          </div>
          <div className="mt-3.5">
            <Label>Meta title</Label>
            <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="inp" />
          </div>
          <div className="mt-3.5">
            <Label>Meta description</Label>
            <textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              rows={2}
              className="inp !h-auto py-2.5 text-[12px] leading-relaxed"
            />
          </div>
        </Card>
      </div>

      {/* ---------------- CỘT PHẢI ---------------- */}
      <div className="flex flex-col gap-4.5">
        <div className="bg-white border border-line rounded-card p-5 sticky top-5">
          <div className="text-sm font-bold mb-3">{t("products.publish")}</div>
          <div className="flex flex-col gap-2">
            {(
              [
                ["ACTIVE", t("products.active")],
                ["DRAFT", t("products.draft")],
                ["HIDDEN", t("products.hidden")],
              ] as const
            ).map(([val, label]) => (
              <label key={val} className="flex items-center gap-2.5 text-[13px]">
                <input
                  type="radio"
                  checked={status === val}
                  onChange={() => setStatus(val)}
                  className="accent-bloom"
                />
                {label}
              </label>
            ))}
          </div>

          <div className="border-t border-line mt-3.5 pt-3.5 flex flex-col gap-2.5">
            <label className="flex items-center gap-2.5 text-[13px]">
              <input
                type="checkbox"
                checked={isBestSeller}
                onChange={(e) => setIsBestSeller(e.target.checked)}
                className="accent-bloom"
              />
              {t("products.tagBestSeller")}
            </label>
            <label className="flex items-center gap-2.5 text-[13px]">
              <input
                type="checkbox"
                checked={isNew}
                onChange={(e) => setIsNew(e.target.checked)}
                className="accent-bloom"
              />
              {t("products.tagNew")}
            </label>
            <label className="flex items-center gap-2.5 text-[13px]">
              <input
                type="checkbox"
                checked={orderType === "PREORDER"}
                onChange={(e) => setOrderType(e.target.checked ? "PREORDER" : "INSTOCK")}
                className="accent-bloom"
              />
              {t("products.tagPreorder")}
            </label>
          </div>

          {!canApprove && (
            <div className="bg-[#FEFBF4] border border-[#F0E4CB] rounded-[10px] p-3 mt-3.5 flex gap-2">
              <span className="text-warning shrink-0">⚠</span>
              <div className="text-[12px] leading-relaxed text-[#7A5B1E]">
                {t("products.publishNoApprove")}{" "}
                {mode === "create"
                  ? t("products.publishNoApproveCreate")
                  : t("products.publishNoApproveEdit")}
              </div>
            </div>
          )}

          <Submit mode={mode} />
          <button
            type="button"
            onClick={() => submitAs("DRAFT")}
            className="w-full h-10 bg-white border border-line rounded-lg text-[13px] font-medium mt-2.5"
          >
            {t("products.saveDraft")}
          </button>
        </div>

        {canCost && (
          <div className="bg-white border border-line rounded-card p-5">
            <div className="text-sm font-bold mb-3">
              {t("products.priceProfit")} {v0?.name ? `(${v0.name})` : ""}
            </div>
            <div className="text-[13px] flex flex-col gap-2">
              <Line k={t("products.sellPrice")} v={v0?.price ? formatVND(v0.price) : "—"} />
              <Line
                k={t("products.salePrice")}
                v={v0?.salePrice ? formatVND(v0.salePrice) : "—"}
                accent="sale"
              />
              <Line k={t("products.cost")} v={v0cost ? formatVND(v0cost) : "—"} muted />
              <div className="border-t border-line mt-1 pt-2">
                <Line
                  k={t("products.margin")}
                  v={margin == null ? "—" : `${margin}%`}
                  accent={margin != null && margin < 15 ? "sale" : "success"}
                />
              </div>
            </div>
          </div>
        )}

        {mode === "edit" && priceHistory.length > 0 && (
          <div className="bg-white border border-line rounded-card p-5">
            <div className="text-sm font-bold mb-3">{t("products.priceHistory")}</div>
            <div className="flex flex-col gap-3 text-[12px]">
              {priceHistory.map((h, i) => (
                <div key={i}>
                  <b>{h.label}</b>
                  <div className="text-muted-2">
                    {h.by} · {h.at}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>

      <style>{`
        .inp{width:100%;min-height:44px;border:1px solid var(--border);border-radius:8px;padding:0 13px;font-size:13px;display:flex;align-items:center;background:#fff;outline:none}
        .inp:focus-within,.inp:focus{border-color:var(--bloom)}
        textarea.inp{display:block}
        .cell{width:100%;height:36px;border:1px solid var(--border);border-radius:7px;padding:0 9px;font-size:12.5px;background:#fff;outline:none}
        .cell:focus{border-color:var(--bloom)}
      `}</style>
    </form>
  );
}

function Submit({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  const t = useAdminT();
  return (
    <button
      disabled={pending}
      className="w-full h-11 bg-bloom text-white hover:bg-bloom-ink rounded-lg text-[13.5px] font-semibold mt-3.5 disabled:opacity-60"
    >
      {pending
        ? t("common.saving")
        : mode === "create"
          ? t("products.add")
          : t("common.save")}
    </button>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-line rounded-card p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="text-sm font-bold">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[12px] font-semibold text-[#4A4A4A] mb-1.5 block">{children}</span>
  );
}

function Line({
  k,
  v,
  muted,
  accent,
}: {
  k: string;
  v: string;
  muted?: boolean;
  accent?: "sale" | "success";
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-2">{k}</span>
      <span
        className={
          accent === "sale"
            ? "text-sale font-semibold"
            : accent === "success"
              ? "text-success font-semibold"
              : muted
                ? "text-muted"
                : "font-semibold"
        }
      >
        {v}
      </span>
    </div>
  );
}

function StatusBadge({
  status,
  canApprove,
}: {
  status: FormProduct["status"];
  canApprove: boolean;
}) {
  const t = useAdminT();
  const map = {
    ACTIVE: { t: t("products.active"), c: "bg-[#E7F1FA] text-success" },
    DRAFT: {
      t: canApprove ? t("products.draft") : t("products.pendingApprovalBadge"),
      c: "bg-[#FBF3E6] text-warning",
    },
    HIDDEN: { t: t("products.hidden"), c: "bg-[#F0F0EC] text-muted" },
  } as const;
  const s = map[status];
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${s.c}`}>{s.t}</span>
  );
}
