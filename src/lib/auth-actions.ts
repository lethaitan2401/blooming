"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { createSession, destroySession } from "./auth";
import { STAFF_ROLE_KEYS } from "./rbac";

export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) return { error: "Vui lòng nhập email và mật khẩu." };

  const user = await db.user.findUnique({
    where: { email },
    include: { role: true },
  });
  if (!user || !user.isActive) return { error: "Tài khoản không tồn tại hoặc đã bị khoá." };

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "Email hoặc mật khẩu không đúng." };

  if (!STAFF_ROLE_KEYS.includes(user.role.key)) {
    return { error: "Tài khoản này không có quyền truy cập khu quản trị." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    roleKey: user.role.key,
  });
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

/* ---------------- Khách hàng ---------------- */

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

export async function customerLoginAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/account"));

  if (!email || !password) return { error: "Vui lòng nhập email và mật khẩu." };

  const user = await db.user.findUnique({
    where: { email },
    include: { role: true },
  });
  if (!user || !user.isActive)
    return { error: "Email hoặc mật khẩu không đúng." };
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "Email hoặc mật khẩu không đúng." };

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    roleKey: user.role.key,
  });
  redirect(next);
}

export async function registerCustomerAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/account"));

  if (!name || !email || !password)
    return { error: "Vui lòng nhập họ tên, email và mật khẩu." };
  if (password.length < 6)
    return { error: "Mật khẩu cần tối thiểu 6 ký tự." };
  if (!/^\S+@\S+\.\S+$/.test(email))
    return { error: "Email không hợp lệ." };

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "Email này đã được đăng ký." };

  let customerRole = await db.role.findUnique({ where: { key: "customer" } });
  if (!customerRole) {
    customerRole = await db.role.create({
      data: { key: "customer", name: "Khách hàng", permissions: [] },
    });
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      passwordHash: await bcrypt.hash(password, 10),
      roleId: customerRole.id,
    },
  });

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    roleKey: "customer",
  });
  redirect(next);
}

export async function customerLogoutAction() {
  await destroySession();
  redirect("/");
}
