import { db } from "@/lib/db";
import { PERMISSIONS, ROLE_PRESETS, ADMIN_ACCESS, can } from "@/lib/rbac";
import { guardAdmin } from "@/lib/admin-guard";
import { formatDateTime } from "@/lib/format";
import { adminT } from "@/lib/admin-i18n";
import { getLocale } from "@/lib/i18n";
import {
  RolesManager,
  type RoleDTO,
  type StaffDTO,
  type PermRow,
} from "@/components/admin/roles-manager";

export const metadata = { title: "Blooming Admin" };

const PERM_ROWS: { perm: string; k: string; highlight?: boolean }[] = [
  { perm: PERMISSIONS.PRODUCT_WRITE, k: "perm.product" },
  { perm: PERMISSIONS.PRICE_PUBLISH, k: "perm.pricePublish", highlight: true },
  { perm: PERMISSIONS.PRICE_APPROVE, k: "perm.priceApprove", highlight: true },
  { perm: PERMISSIONS.COST_VIEW, k: "perm.costView" },
  { perm: PERMISSIONS.ORDER_WRITE, k: "perm.order" },
  { perm: PERMISSIONS.INVENTORY_WRITE, k: "perm.inventory" },
  { perm: PERMISSIONS.SHIPPING_WRITE, k: "perm.shipping" },
  { perm: PERMISSIONS.PROMO_WRITE, k: "perm.promo" },
  { perm: PERMISSIONS.REPORT_VIEW, k: "perm.report" },
  { perm: PERMISSIONS.SETTINGS_WRITE, k: "perm.settings" },
  { perm: PERMISSIONS.RBAC_WRITE, k: "perm.rbac" },
];

const ROLE_SORT = [
  "super_admin",
  "manager",
  "staff_product",
  "staff_order",
  "staff_wh",
  "accountant",
  "customer",
];

export default async function RolesPage() {
  const actor = await guardAdmin(ADMIN_ACCESS["/admin/roles"]);
  const tt = adminT(await getLocale());
  const permRows: PermRow[] = PERM_ROWS.map((r) => ({
    perm: r.perm,
    label: tt(r.k as never),
    highlight: r.highlight,
  }));

  const [rolesRaw, users] = await Promise.all([
    db.role.findMany(),
    db.user.findMany({
      where: { role: { key: { not: "customer" } } },
      include: { role: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const roles: RoleDTO[] = rolesRaw
    .sort((a, b) => ROLE_SORT.indexOf(a.key) - ROLE_SORT.indexOf(b.key))
    .map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      permissions: r.permissions,
      description: ROLE_PRESETS[r.key]?.description ?? "",
      memberCount: users.filter((u) => u.roleId === r.id).length,
    }));

  const staff: StaffDTO[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    roleId: u.roleId,
    roleKey: u.role.key,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt ? formatDateTime(u.lastLoginAt) : null,
  }));

  return (
    <div className="p-6 md:p-8">
      <RolesManager
        roles={roles}
        staff={staff}
        permRows={permRows}
        canEditPerms={can(actor.role.permissions, PERMISSIONS.RBAC_WRITE)}
        actorRoleKey={actor.role.key}
        actorId={actor.id}
      />
    </div>
  );
}
