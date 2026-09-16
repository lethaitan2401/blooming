import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { STAFF_ROLE_KEYS, can, type Permission } from "./rbac";

type Guard = {
  /** Cần có ít nhất một trong các quyền này */
  anyOf?: Permission[];
  /** Hoặc thuộc một trong các vai trò này (theo key) */
  roles?: string[];
};

export type AdminUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/**
 * Guard cho mọi trang trong khu admin.
 * - Chưa đăng nhập / không phải nhân viên -> /admin/login
 * - Thiếu quyền -> /admin/forbidden
 */
export async function guardAdmin(guard?: Guard): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user || !STAFF_ROLE_KEYS.includes(user.role.key)) {
    redirect("/admin/login");
  }

  if (!guard || hasAccess(user, guard)) return user;

  redirect("/admin/forbidden");
}

export function hasAccess(
  user: { role: { key: string; permissions: string[] } },
  guard: Guard,
): boolean {
  if (user.role.key === "super_admin") return true;
  // Không nêu điều kiện -> mọi nhân viên đều vào được
  if (!guard.roles?.length && !guard.anyOf?.length) return true;
  if (guard.roles?.includes(user.role.key)) return true;
  return guard.anyOf?.some((p) => can(user.role.permissions, p)) ?? false;
}
