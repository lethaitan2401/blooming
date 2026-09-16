"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { placeOrderAction } from "@/lib/actions";
import { formatVND } from "@/lib/format";
import { PlaceholderImage } from "./placeholder-image";

type Line = {
  id: string;
  name: string;
  variantName: string;
  tint: string;
  unit: number;
  qty: number;
  lineTotal: number;
  preorder: boolean;
};

const CARRIER = {
  GHN: { label: "GHN — Giao Hàng Nhanh", eta: "2–3 ngày" },
  GHTK: { label: "GHTK — Giao Hàng Tiết Kiệm", eta: "3–5 ngày" },
};

type Defaults = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  province: string;
  district: string;
  ward: string;
  addressLine: string;
};

export function CheckoutForm({
  lines,
  subtotal,
  hasPreorder,
  defaults,
  sampleThreshold,
}: {
  lines: Line[];
  subtotal: number;
  hasPreorder: boolean;
  defaults: Defaults;
  sampleThreshold: number;
}) {
  const [carrier, setCarrier] = useState<"GHN" | "GHTK">("GHN");
  const [paymentMode, setPaymentMode] = useState<"full" | "deposit">(
    hasPreorder ? "deposit" : "full",
  );
  const [depositRate, setDepositRate] = useState(50);
  const [depositMode, setDepositMode] = useState<"percent" | "amount">("percent");
  const [depositAmount, setDepositAmount] = useState("");
  const [providerChoice, setProviderChoice] = useState<"BANK_TRANSFER" | "COD">(
    "BANK_TRANSFER",
  );
  // đơn đặt cọc bắt buộc chuyển khoản
  const provider = paymentMode === "deposit" ? "BANK_TRANSFER" : providerChoice;
  const setProvider = setProviderChoice;
  const total = subtotal; // phí ship từ Hàn tính theo kg — báo sau
  const giftSample = subtotal >= sampleThreshold;
  const sampleGap = Math.max(0, sampleThreshold - subtotal);
  const payNow = useMemo(() => {
    if (paymentMode !== "deposit") return total;
    if (depositMode === "amount") {
      const raw = Math.round(Number(depositAmount) || 0);
      return Math.min(total, Math.max(0, raw));
    }
    return Math.round((total * depositRate) / 100);
  }, [paymentMode, depositMode, depositAmount, depositRate, total]);
  const balance = total - payNow;

  return (
    <form
      action={placeOrderAction}
      className="grid lg:grid-cols-[1fr_420px] gap-8"
    >
      <div className="flex flex-col gap-5">
        {hasPreorder && (
          <div className="bg-[#E7F1FA] border border-[#CFE3F3] rounded-xl px-4 py-3.5 text-[12.5px] leading-relaxed text-[#134D73]">
            Đơn có <b>sản phẩm đặt trước</b> (order từ Hàn) — dự kiến hàng về{" "}
            <b>12–18 ngày</b>. Cần <b>đặt cọc tối thiểu 50%</b>, phần còn lại
            thanh toán khi hàng về.
          </div>
        )}

        <Card title="1. Thông tin liên hệ">
          <div className="grid sm:grid-cols-2 gap-3.5">
            <Field name="customerName" label="Họ và tên" required defaultValue={defaults.customerName} />
            <Field name="customerPhone" label="Số điện thoại" required defaultValue={defaults.customerPhone} />
            <div className="sm:col-span-2">
              <Field name="customerEmail" label="Email (nhận hoá đơn & theo dõi đơn)" type="email" defaultValue={defaults.customerEmail} />
            </div>
          </div>
        </Card>

        <Card title="2. Địa chỉ giao hàng">
          <div className="grid sm:grid-cols-3 gap-3.5 mb-3.5">
            <Field name="province" label="Tỉnh / Thành phố" defaultValue={defaults.province} required />
            <Field name="district" label="Quận / Huyện" required defaultValue={defaults.district} />
            <Field name="ward" label="Phường / Xã" required defaultValue={defaults.ward} />
          </div>
          <Field name="addressLine" label="Địa chỉ cụ thể" required defaultValue={defaults.addressLine} />
        </Card>

        <Card title="3. Đơn vị vận chuyển">
          <div className="flex flex-col gap-2.5">
            {(Object.keys(CARRIER) as ("GHN" | "GHTK")[]).map((c) => (
              <label
                key={c}
                className={`flex items-center gap-3.5 rounded-[10px] border p-4 cursor-pointer ${
                  carrier === c ? "border-bloom bg-[#FBFBFA]" : "border-line"
                }`}
              >
                <input
                  type="radio"
                  name="carrier"
                  value={c}
                  checked={carrier === c}
                  onChange={() => setCarrier(c)}
                  className="accent-foreground"
                />
                <span className="flex-1">
                  <span className="text-[13.5px] font-semibold block">
                    {CARRIER[c].label}
                  </span>
                  <span className="text-xs text-muted">
                    Dự kiến {CARRIER[c].eta}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted leading-relaxed">
            Hàng được order từ Hàn Quốc —{" "}
            <b>phí ship Hàn → VN tính theo cân nặng (kg)</b>, nhân viên sẽ báo &amp;
            thu sau khi gom đủ và cân đơn.
          </p>
        </Card>

        <Card title="4. Hình thức thanh toán">
          <div className="flex flex-col gap-2.5">
            <label
              className={`flex items-center gap-3.5 rounded-[10px] border p-4 cursor-pointer ${
                paymentMode === "full" ? "border-bloom bg-[#FBFBFA]" : "border-line"
              }`}
            >
              <input
                type="radio"
                name="paymentMode"
                value="full"
                checked={paymentMode === "full"}
                onChange={() => setPaymentMode("full")}
                className="accent-foreground"
              />
              <span className="flex-1">
                <span className="text-[13.5px] font-semibold block">
                  Thanh toán toàn bộ
                </span>
                <span className="text-xs text-muted">
                  Trả 100% ngay — {formatVND(total)}
                </span>
              </span>
            </label>
            <label
              className={`flex items-start gap-3.5 rounded-[10px] border p-4 cursor-pointer ${
                paymentMode === "deposit" ? "border-bloom bg-[#FBFBFA]" : "border-line"
              }`}
            >
              <input
                type="radio"
                name="paymentMode"
                value="deposit"
                checked={paymentMode === "deposit"}
                onChange={() => setPaymentMode("deposit")}
                className="accent-foreground mt-0.5"
              />
              <span className="flex-1">
                <span className="text-[13.5px] font-semibold block">
                  Đặt cọc trước
                </span>
                <span className="text-xs text-muted">
                  {depositMode === "amount"
                    ? "Nhập số tiền cọc, phần còn lại khi hàng về VN"
                    : `Trả cọc ${depositRate}% ngay, phần còn lại khi hàng về VN`}
                </span>
              </span>
            </label>

            {paymentMode === "deposit" && (
              <div className="rounded-[10px] border border-line p-3.5 flex flex-col gap-3">
                <div className="flex gap-2">
                  {(
                    [
                      ["percent", "Theo %"],
                      ["amount", "Nhập số tiền"],
                    ] as const
                  ).map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDepositMode(m)}
                      className={`text-xs font-semibold rounded-md px-3 py-1.5 border ${
                        depositMode === m
                          ? "border-[1.5px] border-bloom"
                          : "border-line text-muted-2"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {depositMode === "percent" ? (
                  <div className="flex gap-1.5">
                    {[30, 50, 70].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setDepositRate(r)}
                        className={`text-xs font-semibold rounded-md px-2.5 py-1.5 border ${
                          depositRate === r
                            ? "border-[1.5px] border-bloom"
                            : "border-line text-muted-2"
                        }`}
                      >
                        {r}%
                      </button>
                    ))}
                  </div>
                ) : (
                  <label className="flex items-center gap-2 text-[12.5px] text-muted">
                    Số tiền cọc
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0"
                      className="w-36 h-10 border border-line rounded-lg px-3 text-[13.5px] text-right outline-none focus:border-bloom"
                    />
                    <span>₫</span>
                  </label>
                )}
              </div>
            )}
          </div>
          <input type="hidden" name="depositRate" value={depositRate} />
          <input type="hidden" name="depositMode" value={depositMode} />
          <input type="hidden" name="depositAmount" value={depositAmount} />

          <div className="h-px bg-line my-4" />
          <div className="text-[12.5px] font-semibold mb-2.5">
            {paymentMode === "deposit" ? "Thanh toán tiền cọc bằng" : "Thanh toán bằng"}
          </div>
          <div className="flex flex-col gap-2.5">
            {(
              [
                [
                  "BANK_TRANSFER",
                  "Chuyển khoản ngân hàng (VietQR)",
                  "Quét mã QR — tự điền số tiền & nội dung. Đơn xử lý sau khi xác nhận đã nhận tiền.",
                ],
                [
                  "COD",
                  "Thanh toán khi nhận hàng (COD)",
                  paymentMode === "deposit"
                    ? "Đơn đặt trước bắt buộc chuyển khoản tiền cọc — không áp dụng COD cho phần cọc."
                    : "Chỉ áp dụng cho đơn có sẵn.",
                ],
              ] as const
            ).map(([p, label, desc]) => {
              const disabled = p === "COD" && paymentMode === "deposit";
              return (
                <label
                  key={p}
                  className={`flex items-start gap-3.5 rounded-[10px] border p-4 ${
                    disabled
                      ? "opacity-45 cursor-not-allowed border-line"
                      : provider === p
                        ? "border-bloom bg-[#FBFBFA] cursor-pointer"
                        : "border-line cursor-pointer"
                  }`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={p}
                    checked={provider === p}
                    disabled={disabled}
                    onChange={() => setProvider(p as "BANK_TRANSFER" | "COD")}
                    className="accent-bloom mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="text-[13.5px] font-semibold block">{label}</span>
                    <span className="text-[11.5px] text-muted leading-snug block mt-0.5">
                      {desc}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {paymentMode === "deposit" && (
            <p className="mt-3 text-xs text-muted leading-relaxed">
              Phần còn lại <b>{formatVND(balance)}</b> + <b>phí ship từ Hàn</b>{" "}
              (tính theo kg) sẽ được nhắc thanh toán khi hàng về kho — chuyển
              khoản hoặc COD khi giao.
            </p>
          )}
        </Card>

        <Card title="Ghi chú">
          <textarea
            name="note"
            rows={2}
            placeholder="Giao trong giờ hành chính, gọi trước khi đến…"
            className="w-full border border-line rounded-lg px-3.5 py-3 text-[13.5px] outline-none"
          />
        </Card>
      </div>

      {/* summary */}
      <div>
        <div className="bg-white border border-line rounded-card p-6 sticky top-5">
          <div className="text-base font-bold mb-4">
            Đơn hàng ({lines.length} sản phẩm)
          </div>
          <div className="flex flex-col gap-3.5 max-h-[240px] overflow-auto">
            {lines.map((l) => (
              <div key={l.id} className="flex gap-3">
                <PlaceholderImage
                  tint={l.tint}
                  iconSize={20}
                  className="w-14 h-14 rounded-lg shrink-0"
                />
                <div className="flex-1">
                  <div className="text-[12.5px] font-medium leading-snug">
                    {l.name}
                  </div>
                  <div className="text-xs text-muted-2 mt-0.5">
                    {l.variantName} · SL {l.qty}
                  </div>
                </div>
                <div className="text-[12.5px] font-bold whitespace-nowrap">
                  {formatVND(l.lineTotal)}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-line pt-4 mt-4 text-[13.5px]">
            <Row label="Tạm tính" value={formatVND(subtotal)} />
            <Row
              label="Phí ship từ Hàn Quốc"
              value="Tính theo kg · báo sau"
            />
            <div className="flex justify-between items-baseline border-t border-line mt-2.5 pt-3.5">
              <span className="text-sm font-bold">Tạm thu</span>
              <span className="text-base font-bold">{formatVND(total)}</span>
            </div>
            <p className="text-[11.5px] text-muted-2 mt-2 leading-snug">
              Chưa gồm phí ship Hàn → VN. Nhân viên báo phí theo cân nặng sau khi
              gom đơn, thu cùng phần còn lại.
            </p>
          </div>

          <div
            className={`rounded-[10px] px-3.5 py-2.5 mt-3.5 text-[12px] leading-snug ${
              giftSample
                ? "bg-[#E7F1FA] text-[#134D73]"
                : "bg-surface text-muted"
            }`}
          >
            {giftSample ? (
              <>🎁 Đơn của bạn được <b>tặng mẫu thử</b> kèm khi giao.</>
            ) : (
              <>
                Mua thêm <b>{formatVND(sampleGap)}</b> để được tặng mẫu thử (đơn từ{" "}
                {formatVND(sampleThreshold)}).
              </>
            )}
          </div>

          {paymentMode === "deposit" && (
            <div className="bg-surface rounded-[10px] p-3.5 mt-3.5">
              <div className="flex justify-between items-baseline">
                <span className="text-[13px] font-bold">
                  Đặt cọc ngay
                  {depositMode === "percent" && total > 0
                    ? ` (${Math.round((payNow / total) * 100)}%)`
                    : ""}
                </span>
                <span className="text-lg font-bold text-bloom">
                  {formatVND(payNow)}
                </span>
              </div>
              <div className="flex justify-between text-[12.5px] text-muted mt-2">
                <span>Còn lại — khi hàng về</span>
                <span>{formatVND(balance)}</span>
              </div>
            </div>
          )}

          <SubmitButton
            amount={payNow}
            disabled={
              paymentMode === "deposit" &&
              depositMode === "amount" &&
              payNow < 10000
            }
          />
          <p className="text-[11.5px] text-muted-2 leading-snug mt-3 text-center">
            Bằng việc đặt hàng, bạn đồng ý với Điều khoản & Chính sách bảo mật của Blooming.
          </p>
        </div>
      </div>
    </form>
  );
}

function SubmitButton({
  amount,
  disabled,
}: {
  amount: number;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending || disabled}
      className="w-full h-[52px] bg-bloom text-white hover:bg-bloom-ink rounded-lg text-[15px] font-semibold mt-4 disabled:opacity-60"
    >
      {pending ? "Đang xử lý…" : `Đặt hàng · thanh toán ${formatVND(amount)}`}
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-line rounded-card p-6">
      <div className="text-base font-bold mb-4.5">{title}</div>
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
      <span className="text-[12.5px] font-semibold text-[#4A4A4A] mb-1.5 block">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full h-[46px] border border-line rounded-lg px-3.5 text-[13.5px] outline-none focus:border-bloom"
      />
    </label>
  );
}

function Row({
  label,
  value,
  red,
}: {
  label: string;
  value: string;
  red?: boolean;
}) {
  return (
    <div className="flex justify-between mb-2.5">
      <span className="text-muted">{label}</span>
      <span className={red ? "text-sale" : ""}>{value}</span>
    </div>
  );
}
