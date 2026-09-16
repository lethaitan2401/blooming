import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { STAFF_ROLE_KEYS, ADMIN_ACCESS } from "@/lib/rbac";
import { hasAccess } from "@/lib/admin-guard";
import { getLocale } from "@/lib/i18n";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminI18nProvider } from "@/components/admin/admin-i18n";

export const metadata = { title: "Blooming Admin" };

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || !STAFF_ROLE_KEYS.includes(user.role.key)) {
    redirect("/admin/login");
  }
  const locale = await getLocale();

  const allowed = Object.entries(ADMIN_ACCESS)
    .filter(([, rule]) => hasAccess(user, rule))
    .map(([href]) => href);

  return (
    <AdminI18nProvider locale={locale}>
      <div className="flex bg-surface min-h-screen text-foreground">
        <AdminSidebar
          userName={`${user.name} · ${user.role.name}`}
          allowed={allowed}
        />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </AdminI18nProvider>
  );
}
