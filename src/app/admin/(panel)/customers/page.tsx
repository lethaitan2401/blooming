import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { guardAdmin } from "@/lib/admin-guard";
import { ADMIN_ACCESS } from "@/lib/rbac";
import { adminT } from "@/lib/admin-i18n";
import { getLocale } from "@/lib/i18n";

export const metadata = { title: "Blooming Admin" };

export default async function Page() {
  await guardAdmin(ADMIN_ACCESS["/admin/customers"]);
  const t = adminT(await getLocale());
  const customers = await db.user.findMany({
    where: { role: { key: "customer" } },
    include: { _count: { select: { orders: true } }, orders: { select: { total: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-[22px] font-bold tracking-tight mb-5">{t("cust.title")}</h1>
      <div className="bg-white border border-line rounded-card overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-muted-2 text-left">
              <th className="px-4 py-3 border-b border-[#F0F0EC]">{t("cust.customer")}</th>
              <th className="px-4 py-3 border-b border-[#F0F0EC]">{t("cust.orderCount")}</th>
              <th className="px-4 py-3 border-b border-[#F0F0EC]">{t("cust.totalSpent")}</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-[#F4F4F0] text-[13px]">
                <td className="px-4 py-3.5">
                  {c.name}
                  <div className="text-[11px] text-muted-2">{c.email}</div>
                </td>
                <td className="px-4 py-3.5">{c._count.orders}</td>
                <td className="px-4 py-3.5">
                  {formatVND(c.orders.reduce((s, o) => s + o.total, 0))}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={3} className="py-10 text-center text-muted text-sm">
                  {t("cust.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
