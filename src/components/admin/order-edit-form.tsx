"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateOrderAction } from "@/lib/admin-actions";
import { formatVND } from "@/lib/format";
import { PAY_METHODS, PAY_METHOD_VI, normPayMethod } from "@/lib/constants";
import { useAdminT } from "./admin-i18n";
import { ImageUpload } from "./image-upload";

type Variant = {
  id: string;
  name: string;
  price: number;
  salePrice: number | null;
  stock: number;
};
type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  image: string | null;
  tint: string;
  variants: Variant[];
};

type Line = {
  key: string;
  id: string | null; // OrderItem id (null = dòng mới)
  variantId: string | null;
  custom: boolean;
  label: string;
  name: string;
  unitPrice: number;
  quantity: number;
  image: string;
  tint: string;
};

export type OrderDTO = {
  id: string;
  code: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
  note: string | null;
  shippingCarrier: "GHN" | "GHTK";
  shippingFee: number;
  discount: number;
  depositRate: number;
  paymentStatus: "UNPAID" | "DEPOSIT_PAID" | "PAID" | "REFUNDED";
  paymentProvider: string | null;
  hasShipment: boolean;
  items: {
    id: string;
    variantId: string | null;
    productName: string;
    variantName: string;
    unitPrice: number;
    quantity: number;
    image: string | null;
    tint: string;
  }[];
};


export function OrderEditForm({
  order,
  products,
  krShipPerKg = 0,
}: {
  order: OrderDTO;
  products: CatalogProduct[];
  krShipPerKg?: number;
}) {
  const t = useAdminT();
  const [lines, setLines] = useState<Line[]>(
    order.items.map((it) => ({
      key: it.id,
      id: it.id,
      variantId: it.variantId,
      custom: !it.variantId,
      label: it.variantName
        ? `${it.productName} — ${it.variantName}`
        : it.productName,
      name: it.productName,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      image: it.image ?? "",
      tint: it.tint,
    })),
  );
  const [search, setSearch] = useState("");
  const [carrier, setCarrier] = useState(order.shippingCarrier);
  const [shippingFee, setShippingFee] = useState(String(order.shippingFee));
  const [discount, setDiscount] = useState(String(order.discount));
  const [payStatus, setPayStatus] = useState<OrderDTO["paymentStatus"]>(
    order.paymentStatus === "REFUNDED" ? "UNPAID" : order.paymentStatus,
  );
  const [depMode, setDepMode] = useState<"percent" | "amount">("percent");
  const [depRate, setDepRate] = useState(String(order.depositRate || 50));
  const [depAmount, setDepAmount] = useState("");
  const [payProvider, setPayProvider] = useState(
    normPayMethod(order.paymentProvider),
  );

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [search, products]);

  function addVariant(p: CatalogProduct, v: Variant) {
    setLines((L) => {
      const found = L.find((l) => l.variantId === v.id);
      if (found)
        return L.map((l) =>
          l.key === found.key ? { ...l, quantity: l.quantity + 1 } : l,
        );
      return [
        ...L,
        {
          key: crypto.randomUUID(),
          id: null,
          variantId: v.id,
          custom: false,
          label: `${p.brand} ${p.name} — ${v.name}`,
          name: "",
          unitPrice: v.salePrice ?? v.price,
          quantity: 1,
          image: p.image ?? "",
          tint: p.tint,
        },
      ];
    });
    setSearch("");
  }

  function addCustomLine() {
    setLines((L) => [
      ...L,
      {
        key: crypto.randomUUID(),
        id: null,
        variantId: null,
        custom: true,
        label: "",
        name: "",
        unitPrice: 0,
        quantity: 1,
        image: "",
        tint: "#EFEBE3",
      },
    ]);
  }

  const valid = lines.filter(
    (l) =>
      l.quantity > 0 && (l.custom ? l.name.trim() !== "" && l.unitPrice > 0 : true),
  );
  const subtotal = valid.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const disc = Math.min(Number(discount) || 0, subtotal);
  const ship = shippingFee === "" ? order.shippingFee : Number(shippingFee) || 0;
  const total = subtotal - disc + ship;
  const deposit =
    payStatus === "PAID"
      ? total
      : payStatus === "DEPOSIT_PAID"
        ? depMode === "amount"
          ? Math.min(total, Math.max(0, Number(depAmount) || 0))
          : Math.round((total * (Number(depRate) || 0)) / 100)
        : 0;
  const balance = Math.max(0, total - deposit);

  return (
    <form action={updateOrderAction} className="grid lg:grid-cols-[1fr_380px] gap-6">
      <input type="hidden" name="orderId" value={order.id} />
      <input type="hidden" name="carrier" value={carrier} />
      <input type="hidden" name="shippingFee" value={shippingFee} />
      <input type="hidden" name="discount" value={discount} />
      <input type="hidden" name="paymentStatus" value={payStatus} />
      <input type="hidden" name="paymentProvider" value={payProvider} />
      <input type="hidden" name="depositMode" value={depMode} />
      <input type="hidden" name="depositRate" value={depRate} />
      <input type="hidden" name="depositAmount" value={depAmount} />
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          lines.map((l) => ({
            id: l.id,
            variantId: l.variantId,
            name: l.custom ? l.name.trim() : "",
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            imageUrl: l.image.trim() || null,
          })),
        )}
      />

      <div className="flex flex-col gap-5">
        {order.hasShipment && (
          <div className="bg-[#FBF3E6] border border-[#F0E4CB] rounded-lg px-4 py-3 text-[12.5px] text-[#7A5B1E]">
            ⚠ Đơn đã có vận đơn. Sửa sản phẩm / địa chỉ lúc này cần báo lại đơn vị
            vận chuyển.
          </div>
        )}

        <Card title={t("orders.recipient")}>
          <div className="grid sm:grid-cols-2 gap-3.5">
            <Field name="customerName" label={t("field.fullName")} defaultValue={order.customerName} required />
            <Field name="customerPhone" label={t("field.phone")} defaultValue={order.customerPhone} required />
            <div className="sm:col-span-2">
              <Field name="customerEmail" label={t("field.email")} type="email" defaultValue={order.customerEmail ?? ""} />
            </div>
          </div>
        </Card>

        <Card title={t("orders.shippingAddress")}>
          <div className="grid sm:grid-cols-3 gap-3.5 mb-3.5">
            <Field name="province" label={t("field.province")} defaultValue={order.province} required />
            <Field name="district" label={t("field.district")} defaultValue={order.district} required />
            <Field name="ward" label={t("field.ward")} defaultValue={order.ward} required />
          </div>
          <Field name="addressLine" label={t("field.addressLine")} defaultValue={order.addressLine} required />
        </Card>

        <Card title={t("orders.items")}>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("orders.searchProduct")}
              className="w-full h-10 border border-line rounded-lg px-3.5 text-[13px] outline-none focus:border-bloom"
            />
            {results.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-line rounded-lg shadow-lg max-h-[280px] overflow-auto">
                {results.map((p) => (
                  <div key={p.id} className="p-2 border-b border-[#F4F4F0] last:border-0 flex gap-2.5">
                    <Thumb url={p.image} tint={p.tint} />
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold">
                        {p.brand} {p.name}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {p.variants.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => addVariant(p, v)}
                            className="text-[11px] border border-line rounded-md px-2 py-1 hover:border-bloom"
                          >
                            {v.name} · {formatVND(v.salePrice ?? v.price)}{" "}
                            <span className="text-muted-2">(tồn {v.stock})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {lines.map((l) => (
              <div key={l.key} className="border border-line rounded-lg p-2 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  {l.custom ? (
                    <input
                      value={l.name}
                      onChange={(e) =>
                        setLines((L) =>
                          L.map((x) => (x.key === l.key ? { ...x, name: e.target.value } : x)),
                        )
                      }
                      placeholder={t("orders.customItemName")}
                      className="flex-1 min-w-0 h-8 border border-line rounded-md px-2 text-[12px]"
                    />
                  ) : (
                    <div className="flex-1 min-w-0 text-[12px] leading-tight">{l.label}</div>
                  )}
                  <input
                    type="number"
                    min={1}
                    value={l.quantity}
                    onChange={(e) =>
                      setLines((L) =>
                        L.map((x) =>
                          x.key === l.key
                            ? { ...x, quantity: Math.max(1, +e.target.value || 1) }
                            : x,
                        ),
                      )
                    }
                    className="w-14 h-8 border border-line rounded-md px-1.5 text-[12px] text-center"
                  />
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={l.unitPrice}
                    onChange={(e) =>
                      setLines((L) =>
                        L.map((x) =>
                          x.key === l.key
                            ? { ...x, unitPrice: Math.max(0, +e.target.value || 0) }
                            : x,
                        ),
                      )
                    }
                    className="w-24 h-8 border border-line rounded-md px-1.5 text-[12px] text-right"
                  />
                  <span className="w-24 text-right text-[12px] font-semibold">
                    {formatVND(l.unitPrice * l.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLines((L) => L.filter((x) => x.key !== l.key))}
                    className="text-muted-2 hover:text-sale text-sm px-1"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-2 pt-0.5 border-t border-[#F4F4F0]">
                  <span className="text-[11px] text-muted-2 shrink-0">Ảnh SP:</span>
                  <ImageUpload
                    value={l.image}
                    tint={l.tint}
                    onChange={(url) =>
                      setLines((L) =>
                        L.map((x) => (x.key === l.key ? { ...x, image: url } : x)),
                      )
                    }
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addCustomLine}
              className="self-start text-[12px] text-bloom font-semibold mt-1"
            >
              {t("orders.addCustomItem")}
            </button>
          </div>
        </Card>

        <Card title="Thanh toán / Đặt cọc">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["UNPAID", "Chưa thanh toán"],
                ["DEPOSIT_PAID", "Đã đặt cọc"],
                ["PAID", "Đã thanh toán đủ"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setPayStatus(v)}
                className={`text-[12px] px-3 py-1.5 rounded-md border ${
                  payStatus === v
                    ? "border-bloom bg-[#E7F1FA] text-bloom font-semibold"
                    : "border-line text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {payStatus === "DEPOSIT_PAID" && (
            <div className="flex flex-col gap-2.5 mt-3">
              <div className="flex gap-2">
                {(
                  [
                    ["percent", "Theo %"],
                    ["amount", "Số tiền cụ thể"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDepMode(v)}
                    className={`text-[11.5px] px-2.5 py-1 rounded-md border ${
                      depMode === v
                        ? "border-bloom bg-[#E7F1FA] text-bloom font-semibold"
                        : "border-line text-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {depMode === "percent" ? (
                <div className="flex items-center gap-2">
                  {[30, 50, 70].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDepRate(String(r))}
                      className={`text-[12px] px-2.5 py-1 rounded-md border ${
                        Number(depRate) === r
                          ? "border-bloom bg-[#E7F1FA] text-bloom font-semibold"
                          : "border-line text-muted"
                      }`}
                    >
                      {r}%
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={depRate}
                    onChange={(e) => setDepRate(e.target.value)}
                    className="w-16 h-8 border border-line rounded-md px-2 text-[12px] text-right"
                  />
                  <span className="text-[12px] text-muted-2">%</span>
                </div>
              ) : (
                <label className="flex items-center gap-2 text-[12px] text-muted-2">
                  Số tiền cọc
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={depAmount}
                    onChange={(e) => setDepAmount(e.target.value)}
                    placeholder="0"
                    className="w-32 h-8 border border-line rounded-md px-2 text-[12px] text-right"
                  />
                  ₫
                </label>
              )}
            </div>
          )}

          {payStatus !== "UNPAID" && (
            <div className="border-t border-line mt-3 pt-3 flex flex-col gap-2.5">
              <label className="flex items-center gap-2 text-[12px] text-muted-2">
                Hình thức thanh toán
                <select
                  value={payProvider}
                  onChange={(e) => setPayProvider(normPayMethod(e.target.value))}
                  className="flex-1 h-8 border border-line rounded-md px-2 text-[12px] bg-white"
                >
                  {PAY_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {PAY_METHOD_VI[m]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="text-[12.5px] flex flex-col gap-1">
                <Row k="Đã thu" v={formatVND(deposit)} />
                {balance > 0 && (
                  <Row k="Còn phải thu" v={formatVND(balance)} red />
                )}
              </div>
            </div>
          )}
        </Card>

        <Card title={t("orders.note")}>
          <textarea
            name="note"
            rows={2}
            defaultValue={order.note ?? ""}
            className="w-full border border-line rounded-lg px-3.5 py-3 text-[13px] outline-none focus:border-bloom"
          />
        </Card>
      </div>

      <div>
        <div className="bg-white border border-line rounded-card p-5 sticky top-5 flex flex-col gap-4">
          <div className="text-[13px] font-bold">Đơn #{order.code}</div>

          <div>
            <div className="text-[12px] font-semibold mb-2">
              {t("orders.shipping")}
            </div>
            <div className="flex gap-2 mb-2">
              {(["GHN", "GHTK"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCarrier(c)}
                  className={`text-[12px] px-3 py-1.5 rounded-md border ${
                    carrier === c
                      ? "border-bloom bg-[#E7F1FA] text-bloom font-semibold"
                      : "border-line text-muted"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <label className="text-[11.5px] text-muted-2 flex items-center gap-2">
              Phí ship từ Hàn (₫)
              <input
                type="number"
                min={0}
                step={1}
                value={shippingFee}
                onChange={(e) => setShippingFee(e.target.value)}
                className="w-28 h-8 border border-line rounded-md px-2 text-[12px] text-right"
              />
            </label>
            {krShipPerKg > 0 && (
              <p className="text-[11px] text-muted-2 mt-1">
                Gợi ý: {formatVND(krShipPerKg)}/kg
              </p>
            )}
          </div>

          <label className="text-[11.5px] text-muted-2 flex items-center justify-between">
            {t("orders.discount")} (₫)
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-28 h-8 border border-line rounded-md px-2 text-[12px] text-right"
            />
          </label>

          <div className="border-t border-line pt-3 text-[13px] flex flex-col gap-1.5">
            <Row k={t("orders.subtotal")} v={formatVND(subtotal)} />
            {disc > 0 && <Row k={t("orders.discount")} v={`−${formatVND(disc)}`} red />}
            <Row k="Phí ship từ Hàn" v={ship > 0 ? formatVND(ship) : "—"} />
            <div className="flex justify-between font-bold text-[14px] pt-1">
              <span>{t("orders.grandTotal")}</span>
              <span>{formatVND(total)}</span>
            </div>
            {payStatus !== "UNPAID" && (
              <>
                <Row
                  k={payStatus === "PAID" ? "Đã thanh toán" : "Đã cọc"}
                  v={formatVND(deposit)}
                />
                {balance > 0 && (
                  <Row k="Còn phải thu" v={formatVND(balance)} red />
                )}
              </>
            )}
          </div>

          <Submit disabled={valid.length === 0} />
          <p className="text-[11px] text-muted-2">
            Lưu xong tồn kho tự cân đối theo chênh lệch số lượng.
          </p>
        </div>
      </div>
    </form>
  );
}

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const t = useAdminT();
  return (
    <button
      disabled={pending || disabled}
      className="w-full h-11 bg-bloom text-white hover:bg-bloom-ink rounded-lg text-[14px] font-semibold disabled:opacity-50"
    >
      {pending ? t("common.saving") : t("common.save")}
    </button>
  );
}

function Thumb({ url, tint }: { url: string | null; tint: string }) {
  return (
    <div
      className="w-9 h-9 rounded-md overflow-hidden shrink-0 border border-line"
      style={{ background: tint || "#EFEBE3" }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-line rounded-card p-5">
      <div className="text-sm font-bold mb-3.5">{title}</div>
      {children}
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-[#4A4A4A] mb-1 block">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full h-10 border border-line rounded-lg px-3 text-[13px] outline-none focus:border-bloom"
      />
    </label>
  );
}

function Row({ k, v, red }: { k: string; v: string; red?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{k}</span>
      <span className={red ? "text-sale" : ""}>{v}</span>
    </div>
  );
}
