import Link from "next/link";
import { db } from "@/lib/db";
import { formatVND, formatDateTime } from "@/lib/format";
import { guardAdmin } from "@/lib/admin-guard";
import { ADMIN_ACCESS } from "@/lib/rbac";
import { adminT, type AdminKey } from "@/lib/admin-i18n";
import { getLocale } from "@/lib/i18n";
import { OrderActions } from "@/components/admin/order-actions";
import { BankTransferBox } from "@/components/admin/bank-transfer-box";
import { PaymentQuickBox } from "@/components/admin/payment-quick-box";
import { ZoomImage } from "@/components/admin/zoom-image";

export const metadata = { title: "Blooming Admin" };

const STATUS_CLS: Record<string, string> = {
  PENDING: "bg-[#FBF3E6] text-warning",
  CONFIRMED: "bg-[#EAF0F6] text-[#3A6EA5]",
  SOURCING: "bg-[#EAF0F6] text-[#3A6EA5]",
  ARRIVED_VN: "bg-[#EAF0F6] text-[#3A6EA5]",
  AWAITING_BALANCE: "bg-[#FBF3E6] text-warning",
  PACKING: "bg-[#EAF0F6] text-[#3A6EA5]",
  HANDED_TO_CARRIER: "bg-[#EAF0F6] text-[#3A6EA5]",
  DELIVERING: "bg-[#EAF0F6] text-[#3A6EA5]",
  COMPLETED: "bg-[#E7F1FA] text-success",
  CANCELLED: "bg-[#F0F0EC] text-muted",
  RETURNED: "bg-[#F0F0EC] text-muted",
  REFUNDED: "bg-[#F0F0EC] text-muted",
};

const PERIODS = ["today", "d7", "d30", "month", "all"] as const;
type Period = (typeof PERIODS)[number];

function periodStart(p: Period): Date | null {
  const now = new Date();
  if (p === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (p === "d7") return new Date(now.getTime() - 7 * 864e5);
  if (p === "d30") return new Date(now.getTime() - 30 * 864e5);
  if (p === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
}

export default async function AdminOrdersPage(props: {
  searchParams: Promise<{ id?: string; status?: string; period?: string }>;
}) {
  await guardAdmin(ADMIN_ACCESS["/admin/orders"]);
  const t = adminT(await getLocale());
  const stLabel = (s: string) => t(`st.${s}` as AdminKey);
  const payLabel = (p: string) => t(`pay.${p}` as AdminKey);
  const sp = await props.searchParams;
  const period: Period = (PERIODS as readonly string[]).includes(sp.period ?? "")
    ? (sp.period as Period)
    : "all";
  const since = periodStart(period);

  const where = {
    ...(sp.status ? { status: sp.status as never } : {}),
    ...(since ? { createdAt: { gte: since } } : {}),
  };
  // giữ status + period khi đổi tab / phân trang
  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    if (sp.status) p.set("status", sp.status);
    if (period !== "all") p.set("period", period);
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined) p.delete(k);
      else p.set(k, v);
    }
    return p.toString() ? `?${p}` : "";
  };

  const [orders, total, selected, counts] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { items: true },
    }),
    db.order.count({ where }),
    sp.id
      ? db.order.findUnique({
          where: { id: sp.id },
          include: {
            items: true,
            payments: { orderBy: { createdAt: "asc" } },
            events: { orderBy: { createdAt: "asc" } },
            shipment: true,
          },
        })
      : Promise.resolve(null),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);

  const pending = counts.find((c) => c.status === "PENDING")?._count ?? 0;

  return (
    <div className="p-6 md:p-7">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[22px] font-bold tracking-tight">{t("orders.title")}</h1>
        <div className="flex gap-2.5">
          <button className="h-9 px-3.5 bg-white border border-line rounded-lg text-[13px] font-medium">
            {t("common.exportExcel")}
          </button>
          <Link
            href="/admin/orders/new"
            className="h-9 px-4 bg-bloom text-white hover:bg-bloom-ink rounded-lg text-[13px] font-semibold flex items-center"
          >
            + {t("orders.new")}
          </Link>
        </div>
      </div>

      <div className="flex gap-4 border-b border-line mb-3 text-[13px]">
        <Link
          href={`/admin/orders${qs({ status: undefined, id: undefined })}`}
          className={`py-2.5 ${!sp.status ? "border-b-2 border-bloom font-semibold" : "text-muted"}`}
        >
          {t("common.all")}
        </Link>
        {(
          [
            ["PENDING", t("orders.tab.pending")],
            ["DELIVERING", t("orders.tab.delivering")],
            ["COMPLETED", t("orders.tab.completed")],
          ] as const
        ).map(([st, label]) => (
          <Link
            key={st}
            href={`/admin/orders${qs({ status: st, id: undefined })}`}
            className={`py-2.5 ${sp.status === st ? "border-b-2 border-bloom font-semibold" : "text-muted"}`}
          >
            {label}
            {st === "PENDING" && <span className="text-sale"> {pending}</span>}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4 text-[12.5px] flex-wrap">
        <span className="text-muted-2">{t("orders.filterTime")}:</span>
        {(
          [
            ["all", t("orders.allTime")],
            ["today", t("orders.today")],
            ["d7", t("orders.d7")],
            ["d30", t("orders.d30")],
            ["month", t("orders.thisMonth")],
          ] as const
        ).map(([p, label]) => (
          <Link
            key={p}
            href={`/admin/orders${qs({ period: p === "all" ? undefined : p, id: undefined })}`}
            className={`px-2.5 py-1 rounded-full border ${
              period === p
                ? "bg-bloom text-white border-bloom"
                : "border-line text-muted hover:border-bloom"
            }`}
          >
            {label}
          </Link>
        ))}
        <span className="text-muted-2 ml-1">
          · {total} {t("orders.count")}
        </span>
      </div>

      <div className="grid xl:grid-cols-[1fr_452px] gap-5">
        <div className="bg-white border border-line rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-muted-2 text-left">
                  <th className="px-4 py-3.5 border-b border-[#F0F0EC]">{t("orders.code")}</th>
                  <th className="px-4 py-3.5 border-b border-[#F0F0EC]">{t("orders.customer")}</th>
                  <th className="px-4 py-3.5 border-b border-[#F0F0EC]">{t("orders.total")}</th>
                  <th className="px-4 py-3.5 border-b border-[#F0F0EC]">{t("orders.payment")}</th>
                  <th className="px-4 py-3.5 border-b border-[#F0F0EC]">{t("orders.status")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className={`border-b border-[#F4F4F0] ${sp.id === o.id ? "bg-[#FAFAF8]" : ""}`}
                  >
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/admin/orders${qs({ id: o.id })}`}
                        className="font-bold text-[12.5px] hover:text-bloom"
                      >
                        #{o.code}
                      </Link>
                      <div className="text-[11px] text-muted-2">
                        {formatDateTime(o.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px]">
                      {o.customerName}
                      <div className="text-[11px] text-muted-2">
                        {o.district}, {o.province}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px]">
                      {formatVND(o.total)}
                      {o.balanceAmount > 0 && (
                        <div className="text-[11px] text-muted-2">
                          {t("orders.remaining")} {formatVND(o.balanceAmount)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                          o.paymentStatus === "PAID"
                            ? "bg-[#E7F1FA] text-success"
                            : o.paymentStatus === "DEPOSIT_PAID"
                              ? "bg-[#EAF0F6] text-[#3A6EA5]"
                              : "bg-[#FBEAEA] text-sale"
                        }`}
                      >
                        {payLabel(o.paymentStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[11px] font-semibold px-2 py-1 rounded-full ${STATUS_CLS[o.status] ?? ""}`}
                      >
                        {stLabel(o.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted text-sm">
                      {t("orders.empty2")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* detail */}
        {selected ? (
          <div className="bg-white border border-line rounded-card p-5 h-fit">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-base font-bold">#{selected.code}</div>
                <div className="text-[12px] text-muted-2 mt-0.5">
                  {formatDateTime(selected.createdAt)}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span
                  className={`text-[11px] font-semibold px-2 py-1 rounded-full ${STATUS_CLS[selected.status] ?? ""}`}
                >
                  {stLabel(selected.status)}
                </span>
                <div className="flex items-center gap-3">
                  {!["COMPLETED", "CANCELLED", "RETURNED", "REFUNDED"].includes(
                    selected.status,
                  ) && (
                    <Link
                      href={`/admin/orders/${selected.id}/edit`}
                      className="text-[11.5px] font-semibold text-bloom hover:text-bloom-ink"
                    >
                      ✎ {t("orders.editShort")}
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="my-4">
              <OrderActions
                orderId={selected.id}
                code={selected.code}
                status={selected.status}
                hasShipment={!!selected.shipment}
              />
            </div>

            <Box title={t("orders.recipient")}>
              <div className="text-[13px] leading-relaxed">
                {selected.customerName} · {selected.customerPhone}
                <br />
                {selected.addressLine}, {selected.ward}, {selected.district},{" "}
                {selected.province}
              </div>
              {selected.note && (
                <div className="text-[12px] text-bloom mt-2">
                  {t("orders.note")}: {selected.note}
                </div>
              )}
            </Box>

            <Box title={`${t("orders.items")} (${selected.items.length})`}>
              {selected.items.map((it) => (
                <div key={it.id} className="flex items-center gap-2 text-[12px] mb-2">
                  <ZoomImage
                    src={it.imageUrl}
                    tint={it.tint}
                    alt={it.productName}
                    className="w-9 h-9"
                  />
                  <span className="flex-1 min-w-0">
                    {it.productName}{" "}
                    <span className="text-muted-2">×{it.quantity}</span>
                  </span>
                  <span className="font-semibold shrink-0">
                    {formatVND(it.unitPrice * it.quantity)}
                  </span>
                </div>
              ))}
              <div className="border-t border-[#F0F0EC] mt-2 pt-2 text-[12px]">
                <Line k={t("orders.subtotal")} v={formatVND(selected.subtotal)} />
                <Line
                  k={`Phí ship từ Hàn (${selected.shippingCarrier})`}
                  v={
                    selected.shippingFee > 0
                      ? formatVND(selected.shippingFee)
                      : "chưa nhập"
                  }
                />
                {selected.discount > 0 && (
                  <Line k={t("orders.discount")} v={`−${formatVND(selected.discount)}`} />
                )}
                <div className="flex justify-between font-bold text-[13px] mt-1">
                  <span>{t("orders.grandTotal")}</span>
                  <span>{formatVND(selected.total)}</span>
                </div>
              </div>
            </Box>

            {(() => {
              const bt = selected.payments.find(
                (p) => p.provider === "BANK_TRANSFER",
              );
              return (
                <>
                  {bt && (
                    <BankTransferBox
                      orderId={selected.id}
                      code={selected.code}
                      amount={bt.amount}
                      status={bt.status}
                      reportedAt={
                        bt.reportedAt ? formatDateTime(bt.reportedAt) : null
                      }
                      paidAt={bt.paidAt ? formatDateTime(bt.paidAt) : null}
                    />
                  )}
                  {(!bt || bt.status === "PAID") && (
                    <PaymentQuickBox
                      orderId={selected.id}
                      paymentStatus={selected.paymentStatus}
                      provider={selected.payments[0]?.provider ?? null}
                      depositAmount={selected.depositAmount}
                      balanceAmount={selected.balanceAmount}
                    />
                  )}
                </>
              );
            })()}

            {selected.depositRate > 0 && (
              <Box title={`${t("orders.payment")} — ${t("orders.deposit")} ${selected.depositRate}%`}>
                <Line
                  k={t("orders.depositPaid")}
                  v={formatVND(selected.depositAmount)}
                  green
                />
                <Line
                  k={t("orders.balanceDue")}
                  v={formatVND(selected.balanceAmount)}
                  red
                />
                <div className="h-1.5 bg-[#EEEEE9] rounded-full mt-3">
                  <div
                    className="h-1.5 bg-bloom rounded-full"
                    style={{ width: `${selected.depositRate}%` }}
                  />
                </div>
              </Box>
            )}

            {selected.shipment && (
              <Box title={t("orders.shipping")}>
                <div className="text-[12px]">
                  {selected.shipment.carrier} · {t("orders.trackingCode")}{" "}
                  <b>{selected.shipment.trackingCode}</b>
                  <div className="text-muted-2 mt-1">
                    {t("orders.status")}: {selected.shipment.status}
                  </div>
                </div>
              </Box>
            )}

            <Box title={t("orders.statusHistory")}>
              {selected.events.map((e) => (
                <div key={e.id} className="text-[12px] mb-2">
                  <span className="font-semibold">
                    {stLabel(e.status)}
                  </span>
                  <span className="text-muted-2">
                    {" "}
                    · {formatDateTime(e.createdAt)}
                  </span>
                </div>
              ))}
            </Box>
          </div>
        ) : (
          <div className="bg-white border border-line rounded-card p-8 text-center text-sm text-muted h-fit">
            {t("orders.selectHint")}
          </div>
        )}
      </div>
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-line rounded-[10px] p-3.5 mb-4">
      <div className="text-[12px] font-bold text-muted mb-2.5">{title}</div>
      {children}
    </div>
  );
}

function Line({
  k,
  v,
  green,
  red,
}: {
  k: string;
  v: string;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="flex justify-between mb-1">
      <span className="text-muted-2">{k}</span>
      <span
        className={green ? "text-success font-semibold" : red ? "text-sale font-bold" : ""}
      >
        {v}
      </span>
    </div>
  );
}
