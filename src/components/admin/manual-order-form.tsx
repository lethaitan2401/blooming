"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createManualOrderAction } from "@/lib/admin-actions";
import { formatVND } from "@/lib/format";
import { PAY_METHODS, PAY_METHOD_VI } from "@/lib/constants";
import { useAdminT } from "./admin-i18n";
import { ImageUpload } from "./image-upload";

type Variant = {
  id: string;
  name: string;
  price: number;
  salePrice: number | null;
  stock: number;
};
type Product = {
  id: string;
  name: string;
  brand: string;
  image: string | null;
  tint: string;
  variants: Variant[];
};
type Line = {
  key: string;
  variantId: string; // "" nếu là SP ngoài danh sách
  custom: boolean;
  label: string; // hiển thị (SP có sẵn)
  name: string; // tên tự nhập (SP ngoài danh sách)
  unitPrice: number;
  quantity: number;
  stock: number;
  image: string;
  tint: string;
};


export function ManualOrderForm({ products }: { products: Product[] }) {
  const t = useAdminT();
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState("");
  const [carrier, setCarrier] = useState<"GHN" | "GHTK">("GHN");
  const [shippingFee, setShippingFee] = useState<string>("");
  const [discount, setDiscount] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState<
    "UNPAID" | "DEPOSIT_PAID" | "PAID"
  >("PAID");
  const [depositRate, setDepositRate] = useState("50");
  const [orderType, setOrderType] = useState<"INSTOCK" | "PREORDER">("INSTOCK");

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

  function addVariant(p: Product, v: Variant) {
    const price = v.salePrice ?? v.price;
    setLines((L) => {
      const found = L.find((l) => l.variantId === v.id);
      if (found)
        return L.map((l) =>
          l.variantId === v.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      return [
        ...L,
        {
          key: crypto.randomUUID(),
          variantId: v.id,
          custom: false,
          label: `${p.brand} ${p.name} — ${v.name}`,
          name: "",
          unitPrice: price,
          quantity: 1,
          stock: v.stock,
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
        variantId: "",
        custom: true,
        label: "",
        name: "",
        unitPrice: 0,
        quantity: 1,
        stock: 0,
        image: "",
        tint: "#EFEBE3",
      },
    ]);
  }

  const validLines = lines.filter((l) =>
    l.quantity > 0 && (l.custom ? l.name.trim() !== "" && l.unitPrice > 0 : true),
  );
  const subtotal = validLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const disc = Math.min(Number(discount) || 0, subtotal);
  const ship = Number(shippingFee) || 0;
  const total = subtotal - disc + ship;
  const payNow =
    paymentStatus === "PAID"
      ? total
      : paymentStatus === "DEPOSIT_PAID"
        ? Math.round((total * (Number(depositRate) || 50)) / 100)
        : 0;

  return (
    <form
      action={createManualOrderAction}
      className="grid lg:grid-cols-[1fr_400px] gap-6"
    >
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          lines.map((l) => ({
            variantId: l.variantId || null,
            name: l.custom ? l.name.trim() : "",
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            imageUrl: l.image.trim() || null,
          })),
        )}
      />
      <input type="hidden" name="carrier" value={carrier} />
      <input type="hidden" name="shippingFee" value={shippingFee} />
      <input type="hidden" name="discount" value={discount} />
      <input type="hidden" name="paymentStatus" value={paymentStatus} />
      <input type="hidden" name="depositRate" value={depositRate} />
      <input type="hidden" name="orderType" value={orderType} />

      <div className="flex flex-col gap-5">
        <Card title={t("orders.customer")}>
          <div className="grid sm:grid-cols-2 gap-3.5">
            <Field name="customerName" label={t("field.fullName")} required />
            <Field name="customerPhone" label={t("field.phone")} required />
            <div className="sm:col-span-2">
              <Field
                name="customerEmail"
                label={t("form.emailLink")}
                type="email"
              />
            </div>
          </div>
        </Card>

        <Card title={t("orders.shippingAddress")}>
          <div className="grid sm:grid-cols-3 gap-3.5 mb-3.5">
            <Field name="province" label={t("field.province")} defaultValue="Bến Tre" required />
            <Field name="district" label={t("field.district")} required />
            <Field name="ward" label={t("field.ward")} required />
          </div>
          <Field name="addressLine" label={t("field.addressLine")} required />
        </Card>

        <Card title={t("orders.items")}>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("orders.searchProduct2")}
              className="w-full h-10 border border-line rounded-lg px-3.5 text-[13px] outline-none focus:border-bloom"
            />
            {results.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-line rounded-lg shadow-lg max-h-[280px] overflow-auto">
                {results.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 border-b border-[#F4F4F0] last:border-0 flex gap-2.5"
                  >
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
            {lines.length === 0 && (
              <p className="text-[12.5px] text-muted-2 py-3 text-center">
                {t("orders.empty2")}
              </p>
            )}
            {lines.map((l) => (
              <div
                key={l.key}
                className="border border-line rounded-lg p-2 flex flex-col gap-2"
              >
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
                    onClick={() =>
                      setLines((L) => L.filter((x) => x.key !== l.key))
                    }
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
          <p className="text-[11px] text-muted-2 mt-2">
            Sản phẩm ngoài danh sách: tự nhập tên + giá, không trừ tồn kho, không gắn
            biến thể. Dùng cho hàng order riêng / quà tặng / SP chưa lên hệ thống.
          </p>
        </Card>

        <Card title={t("orders.note")}>
          <textarea
            name="note"
            rows={2}
            placeholder={t("form.notePlaceholder")}
            className="w-full border border-line rounded-lg px-3.5 py-3 text-[13px] outline-none focus:border-bloom"
          />
        </Card>
      </div>

      {/* summary / settings */}
      <div>
        <div className="bg-white border border-line rounded-card p-5 sticky top-5 flex flex-col gap-4">
          <div>
            <div className="text-[12px] font-semibold mb-2">{t("form.orderType")}</div>
            <div className="flex gap-2">
              {(["INSTOCK", "PREORDER"] as const).map((ot) => (
                <button
                  key={ot}
                  type="button"
                  onClick={() => setOrderType(ot)}
                  className={`text-[12px] px-3 py-1.5 rounded-md border ${
                    orderType === ot
                      ? "border-bloom bg-[#E7F1FA] text-bloom font-semibold"
                      : "border-line text-muted"
                  }`}
                >
                  {ot === "INSTOCK" ? t("form.inStock") : t("form.preorder")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[12px] font-semibold mb-2">{t("orders.shipping")}</div>
            <div className="flex gap-2 mb-2 items-center">
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
                placeholder="0"
                className="w-28 h-8 border border-line rounded-md px-2 text-[12px] text-right"
              />
            </label>
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

          <div>
            <div className="text-[12px] font-semibold mb-2">Thanh toán</div>
            <div className="flex flex-col gap-1.5">
              {[
                ["PAID", t("form.payFull")],
                ["DEPOSIT_PAID", t("form.payDeposit")],
                ["UNPAID", t("form.payUnpaid")],
              ].map(([v, label]) => (
                <label key={v} className="flex items-center gap-2 text-[12.5px]">
                  <input
                    type="radio"
                    checked={paymentStatus === v}
                    onChange={() => setPaymentStatus(v as typeof paymentStatus)}
                    className="accent-bloom"
                  />
                  {label}
                </label>
              ))}
            </div>
            {paymentStatus === "DEPOSIT_PAID" && (
              <label className="text-[11.5px] text-muted-2 flex items-center gap-2 mt-2">
                Mức cọc %
                <input
                  type="number"
                  min={10}
                  max={90}
                  value={depositRate}
                  onChange={(e) => setDepositRate(e.target.value)}
                  className="w-16 h-8 border border-line rounded-md px-2 text-[12px] text-right"
                />
              </label>
            )}
            <select
              name="provider"
              defaultValue="BANK_TRANSFER"
              className="mt-2 w-full h-9 border border-line rounded-md px-2 text-[12.5px] bg-white"
            >
              {PAY_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAY_METHOD_VI[m]}
                </option>
              ))}
            </select>
          </div>

          <select
            name="status"
            defaultValue="CONFIRMED"
            className="w-full h-9 border border-line rounded-md px-2 text-[12.5px] bg-white"
          >
            <option value="CONFIRMED">Trạng thái: Đã xác nhận</option>
            <option value="PENDING">Trạng thái: Chờ xác nhận</option>
            <option value="PACKING">Trạng thái: Đang đóng gói</option>
          </select>

          <div className="border-t border-line pt-3 text-[13px] flex flex-col gap-1.5">
            <Row k={t("orders.subtotal")} v={formatVND(subtotal)} />
            {disc > 0 && <Row k={t("orders.discount")} v={`−${formatVND(disc)}`} red />}
            <Row k="Phí ship từ Hàn" v={ship > 0 ? formatVND(ship) : "—"} />
            <div className="flex justify-between font-bold text-[14px] pt-1">
              <span>{t("orders.grandTotal")}</span>
              <span>{formatVND(total)}</span>
            </div>
            {paymentStatus !== "UNPAID" && (
              <div className="flex justify-between text-[12px] text-bloom">
                <span>Ghi nhận đã thu</span>
                <span>{formatVND(payNow)}</span>
              </div>
            )}
          </div>

          <Submit disabled={validLines.length === 0} />
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
      {pending ? t("common.creating") : t("orders.create")}
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
      <span className="text-[12px] font-semibold text-[#4A4A4A] mb-1 block">
        {label}
      </span>
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
