import { AdminStub } from "@/components/admin/stub";
import { guardAdmin } from "@/lib/admin-guard";
import { ADMIN_ACCESS } from "@/lib/rbac";
import { adminT } from "@/lib/admin-i18n";
import { getLocale } from "@/lib/i18n";

export const metadata = { title: "Blooming Admin" };

export default async function Page() {
  await guardAdmin(ADMIN_ACCESS["/admin/inventory"]);
  const t = adminT(await getLocale());
  return <AdminStub title={t("stub.inventory")} />;
}
