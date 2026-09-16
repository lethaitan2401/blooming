import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { guardAdmin } from "@/lib/admin-guard";
import { ADMIN_ACCESS } from "@/lib/rbac";
import { adminT } from "@/lib/admin-i18n";
import { getLocale } from "@/lib/i18n";

export const metadata = { title: "Blooming Admin" };

export default async function Page() {
  await guardAdmin(ADMIN_ACCESS["/admin/promotions"]);
  const t = adminT(await getLocale());
  const coupons = await db.coupon.findMany({ orderBy: { code: "asc" } });
  return (
    <div className="p-6 md:p-8">
      <h1 className="text-[22px] font-bold tracking-tight mb-5">{t("promo.title")}</h1>
      <div className="bg-white border border-line rounded-card overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-muted-2 text-left">
              <th className="px-4 py-3 border-b border-[#F0F0EC]">{t("promo.code")}</th>
              <th className="px-4 py-3 border-b border-[#F0F0EC]">{t("promo.type")}</th>
              <th className="px-4 py-3 border-b border-[#F0F0EC]">{t("promo.value")}</th>
              <th className="px-4 py-3 border-b border-[#F0F0EC]">{t("promo.minOrder")}</th>
              <th className="px-4 py-3 border-b border-[#F0F0EC]">{t("promo.used")}</th>
              <th className="px-4 py-3 border-b border-[#F0F0EC]">{t("orders.status")}</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-[#F4F4F0] text-[13px]">
                <td className="px-4 py-3.5 font-bold">{c.code}</td>
                <td className="px-4 py-3.5">{c.type}</td>
                <td className="px-4 py-3.5">
                  {c.type === "PERCENT" ? `${c.value}%` : formatVND(c.value)}
                </td>
                <td className="px-4 py-3.5">
                  {c.minSubtotal ? formatVND(c.minSubtotal) : "—"}
                </td>
                <td className="px-4 py-3.5">{c.usedCount}</td>
                <td className="px-4 py-3.5">
                  <span
                    className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                      c.active
                        ? "bg-[#E7F1FA] text-success"
                        : "bg-[#F0F0EC] text-muted"
                    }`}
                  >
                    {c.active ? t("promo.on") : t("promo.off")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
