"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { getCurrentUser } from "./auth";
import { PERMISSIONS, can, ROLE_PRESETS, STAFF_ROLE_KEYS } from "./rbac";

type Result = { ok: boolean; error?: string };

async function requireRbacManager() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role.key === "super_admin") return user;
  if (user.role.key === "manager") return user;
  return null;
}

const ALL_PERMISSIONS = Object.values(PERMISSIONS) as string[];

/** Bật/tắt một quyền cho một vai trò. Chỉ Super Admin. */
export async function toggleRolePermissionAction(
  roleId: string,
  permission: string,
  enabled: boolean,
): Promise<Result> {
  const user = await getCurrentUser();
  if (!user || !can(user.role.permissions, PERMISSIONS.RBAC_WRITE))
    return { ok: false, error: "Chỉ Super Admin được chỉnh ma trận quyền." };
  if (!ALL_PERMISSIONS.includes(permission))
    return { ok: false, error: "Quyền không hợp lệ." };

  const role = await db.role.findUnique({ where: { id: roleId } });
  if (!role) return { ok: false, error: "Vai trò không tồn tại." };
  if (role.key === "super_admin")
    return { ok: false, error: "Super Admin luôn có toàn quyền." };
  if (role.key === "customer")
    return { ok: false, error: "Không gán quyền quản trị cho khách hàng." };

  const set = new Set(role.permissions);
  if (enabled) set.add(permission);
  else set.delete(permission);

  await db.role.update({
    where: { id: roleId },
    data: { permissions: [...set] },
  });
  revalidatePath("/admin/roles");
  return { ok: true };
}

/** Đưa một vai trò về quyền mặc định (preset). Chỉ Super Admin. */
export async function resetRoleToPresetAction(roleId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user || !can(user.role.permissions, PERMISSIONS.RBAC_WRITE))
    return { ok: false, error: "Không có quyền." };
  const role = await db.role.findUnique({ where: { id: roleId } });
  if (!role) return { ok: false, error: "Vai trò không tồn tại." };
  const preset = ROLE_PRESETS[role.key];
  if (!preset) return { ok: false, error: "Vai trò này không có preset." };
  await db.role.update({
    where: { id: roleId },
    data: { permissions: preset.permissions },
  });
  revalidatePath("/admin/roles");
  return { ok: true };
}

/** Đổi vai trò của một nhân viên. Super Admin hoặc Quản lý. */
export async function updateUserRoleAction(
  userId: string,
  roleId: string,
): Promise<Result> {
  const actor = await requireRbacManager();
  if (!actor) return { ok: false, error: "Không có quyền." };

  const [target, newRole] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, include: { role: true } }),
    db.role.findUnique({ where: { id: roleId } }),
  ]);
  if (!target || !newRole) return { ok: false, error: "Không tìm thấy." };
  if (!STAFF_ROLE_KEYS.includes(newRole.key))
    return { ok: false, error: "Chỉ gán được vai trò nhân viên." };

  // Quản lý không được động vào Super Admin, cũng không được phong Super Admin
  if (actor.role.key === "manager") {
    if (target.role.key === "super_admin" || newRole.key === "super_admin")
      return { ok: false, error: "Chỉ Super Admin mới thao tác được vai trò Super Admin." };
  }

  // Không tự hạ vai trò của chính mình
  if (target.id === actor.id)
    return { ok: false, error: "Không thể tự đổi vai trò của chính bạn." };

  await db.user.update({ where: { id: userId }, data: { roleId } });
  revalidatePath("/admin/roles");
  return { ok: true };
}

/** Sửa họ tên nhân viên. Super Admin hoặc Quản lý (Quản lý không sửa Super Admin). */
export async function updateUserNameAction(
  userId: string,
  name: string,
): Promise<Result> {
  const actor = await requireRbacManager();
  if (!actor) return { ok: false, error: "Không có quyền." };

  const clean = name.trim().replace(/\s+/g, " ").slice(0, 80);
  if (clean.length < 2) return { ok: false, error: "Tên tối thiểu 2 ký tự." };

  const target = await db.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!target) return { ok: false, error: "Không tìm thấy tài khoản." };
  if (actor.role.key === "manager" && target.role.key === "super_admin")
    return { ok: false, error: "Không sửa được tài khoản Super Admin." };

  await db.user.update({ where: { id: userId }, data: { name: clean } });
  revalidatePath("/admin/roles");
  return { ok: true };
}

/** Khoá / mở khoá tài khoản nhân viên. */
export async function toggleUserActiveAction(
  userId: string,
  active: boolean,
): Promise<Result> {
  const actor = await requireRbacManager();
  if (!actor) return { ok: false, error: "Không có quyền." };
  const target = await db.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!target) return { ok: false, error: "Không tìm thấy." };
  if (target.id === actor.id)
    return { ok: false, error: "Không thể khoá tài khoản của chính bạn." };
  if (
    actor.role.key === "manager" &&
    target.role.key === "super_admin"
  )
    return { ok: false, error: "Không thao tác được tài khoản Super Admin." };

  if (!active && target.role.key === "super_admin") {
    const activeSupers = await db.user.count({
      where: { role: { key: "super_admin" }, isActive: true },
    });
    if (activeSupers <= 1)
      return { ok: false, error: "Phải còn ít nhất 1 Super Admin hoạt động." };
  }

  await db.user.update({ where: { id: userId }, data: { isActive: active } });
  revalidatePath("/admin/roles");
  return { ok: true };
}

/** Xoá hẳn một tài khoản nhân viên. Super Admin hoặc Quản lý. */
export async function deleteUserAction(userId: string): Promise<Result> {
  const actor = await requireRbacManager();
  if (!actor) return { ok: false, error: "Không có quyền." };

  const target = await db.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!target) return { ok: false, error: "Không tìm thấy tài khoản." };

  if (target.id === actor.id)
    return { ok: false, error: "Không thể xoá tài khoản của chính bạn." };

  if (target.role.key === "super_admin") {
    if (actor.role.key !== "super_admin")
      return { ok: false, error: "Chỉ Super Admin mới xoá được Super Admin." };
    const supers = await db.user.count({ where: { role: { key: "super_admin" } } });
    if (supers <= 1)
      return { ok: false, error: "Phải còn ít nhất 1 Super Admin." };
  }

  // Đơn hàng gắn user này sẽ được gỡ liên kết (userId = null) — không mất đơn.
  try {
    await db.user.delete({ where: { id: userId } });
  } catch {
    return {
      ok: false,
      error: "Không xoá được (còn ràng buộc dữ liệu). Hãy dùng Khoá thay vì Xoá.",
    };
  }
  revalidatePath("/admin/roles");
  return { ok: true };
}

/** Mời / tạo tài khoản nhân viên mới. */
export async function inviteStaffAction(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const actor = await requireRbacManager();
  if (!actor) return { error: "Không có quyền." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleKey = String(formData.get("roleKey") ?? "");

  if (!name || !email || !password || !roleKey)
    return { error: "Nhập đủ họ tên, email, mật khẩu và vai trò." };
  if (password.length < 6) return { error: "Mật khẩu tối thiểu 6 ký tự." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Email không hợp lệ." };
  if (!STAFF_ROLE_KEYS.includes(roleKey))
    return { error: "Vai trò không hợp lệ." };
  if (actor.role.key === "manager" && roleKey === "super_admin")
    return { error: "Chỉ Super Admin mới tạo được tài khoản Super Admin." };

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "Email này đã tồn tại." };

  const role = await db.role.findUnique({ where: { key: roleKey } });
  if (!role) return { error: "Vai trò không tồn tại." };

  await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      roleId: role.id,
    },
  });
  revalidatePath("/admin/roles");
  return { ok: true };
}
