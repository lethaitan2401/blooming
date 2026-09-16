import Link from "next/link";
import { db } from "@/lib/db";
import { formatVND, formatVNDShort, daysAgo } from "@/lib/format";
import { guardAdmin } from "@/lib/admin-guard";
import { adminT } from "@/lib/admin-i18n";
import { getLocale } from "@/lib/i18n";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function AdminDashboard() {
  await guardAdmin();
  const locale = await getLocale();
  const t = adminT(locale);
  const today = startOfDay();
  const month = startOfMonth();
  const paidStatuses = ["DEPOSIT_PAID", "PAID"] as const;

  const [revToday, revMonth, orders30, ordersAll, lowStock, topProducts, payMix, pendingOrders] =
    await Promise.all([
      db.payment.aggregate({
        _sum: { amount: true },
        where: { status: "PAID", paidAt: { gte: today } },
      }),
      db.payment.aggregate({
        _sum: { amount: true },
        where: { status: "PAID", paidAt: { gte: month } },
      }),
      db.order.count({
        where: { createdAt: { gte: daysAgo(30) } },
      }),
      db.order.aggregate({ _sum: { total: true }, _count: true }),
      db.inventory.findMany({
        where: { quantity: { lte: 12 } },
        orderBy: { quantity: "asc" },
        take: 6,
        include: { variant: { include: { product: { select: { name: true } } } } },
      }),
      db.orderItem.groupBy({
        by: ["productName"],
        _sum: { quantity: true, unitPrice: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      db.payment.groupBy({
        by: ["provider"],
        _sum: { amount: true },
        where: { status: "PAID" },
      }),
      db.order.count({ where: { status: "PENDING" } }),
    ]);

  void paidStatuses;
  const aov =
    ordersAll._count > 0
      ? Math.round((ordersAll._sum.total ?? 0) / ordersAll._count)
      : 0;
  const payTotal = payMix.reduce((s, p) => s + (p._sum.amount ?? 0), 0) || 1;

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">{t("dash.title")}</h1>
          <p className="text-[13px] text-muted mt-1">
            {t("dash.updatedAt")}{" "}
            {new Date().toLocaleString(locale === "ko" ? "ko-KR" : "vi-VN")}
          </p>
        </div>
        <div className="flex gap-2.5">
          <span className="h-9 px-3.5 border border-line bg-white rounded-lg flex items-center text-[13px] font-medium">
            {t("dash.last30")}
          </span>
          {pendingOrders > 0 && (
            <Link
              href="/admin/orders"
              className="h-9 px-4 bg-bloom text-white hover:bg-bloom-ink rounded-lg flex items-center text-[13px] font-semibold"
            >
              {pendingOrders} {t("dash.pendingOrders")}
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Kpi label={t("dash.revenueToday")} value={formatVNDShort(revToday._sum.amount ?? 0)} />
        <Kpi label={t("dash.revenueMonth")} value={formatVNDShort(revMonth._sum.amount ?? 0)} />
        <Kpi label={t("dash.orders30")} value={String(orders30)} />
        <Kpi label={t("dash.aov")} value={formatVND(aov)} />
      </div>

      <div className="grid md:grid-cols-[1fr_360px] gap-4 mb-4">
        <Panel title={t("dash.topProducts")}>
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-2 text-left">
                <th className="pb-3">{t("dash.product")}</th>
                <th className="pb-3">{t("dash.sold")}</th>
                <th className="pb-3 text-right">{t("dash.revenue")}</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p) => (
                <tr key={p.productName} className="border-t border-[#F0F0EC]">
                  <td className="py-3 text-[13px]">{p.productName}</td>
                  <td className="py-3 text-[13px]">{p._sum.quantity}</td>
                  <td className="py-3 text-[13px] text-right">
                    {formatVNDShort(
                      (p._sum.unitPrice ?? 0) * (p._sum.quantity ?? 0),
                    )}
                  </td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-muted text-sm">
                    {t("dash.noSales")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>

        <Panel title={t("dash.byPayment")}>
          <div className="flex flex-col gap-4">
            {payMix.length === 0 && (
              <p className="text-sm text-muted">{t("dash.noPayments")}</p>
            )}
            {payMix.map((p) => {
              const pct = Math.round(((p._sum.amount ?? 0) / payTotal) * 100);
              return (
                <div key={p.provider}>
                  <div className="flex justify-between text-[12.5px] mb-1.5">
                    <span>{p.provider}</span>
                    <b>{pct}%</b>
                  </div>
                  <div className="h-2 bg-[#F0F0EC] rounded-full">
                    <div
                      className="h-2 bg-bloom rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel title={t("dash.lowStock")}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-muted-2 text-left">
              <th className="pb-3">{t("dash.product")}</th>
              <th className="pb-3">{t("dash.variant")}</th>
              <th className="pb-3">{t("products.stock")}</th>
              <th className="pb-3 text-right">{t("orders.status")}</th>
            </tr>
          </thead>
          <tbody>
            {lowStock.map((i) => (
              <tr key={i.id} className="border-t border-[#F0F0EC]">
                <td className="py-3 text-[13px]">{i.variant.product.name}</td>
                <td className="py-3 text-[13px] text-muted">{i.variant.name}</td>
                <td className="py-3 text-[13px]">{i.quantity}</td>
                <td className="py-3 text-right">
                  <span
                    className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-full ${
                      i.quantity === 0
                        ? "bg-[#F0F0EC] text-muted"
                        : i.quantity <= 5
                          ? "bg-[#FBEAEA] text-sale"
                          : "bg-[#FBF3E6] text-warning"
                    }`}
                  >
                    {i.quantity === 0
                      ? t("dash.outOfStock")
                      : i.quantity <= 5
                        ? t("dash.almostOut")
                        : t("dash.lowStockShort")}
                  </span>
                </td>
              </tr>
            ))}
            {lowStock.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-muted text-sm">
                  {t("dash.stockOk")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-line rounded-card p-5">
      <div className="text-[12.5px] text-muted">{label}</div>
      <div className="text-[26px] font-bold tracking-tight mt-2">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-line rounded-card p-5">
      <div className="text-sm font-bold mb-3">{title}</div>
      {children}
    </div>
  );
}
