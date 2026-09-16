"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  customerLoginAction,
  registerCustomerAction,
} from "@/lib/auth-actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full h-12 bg-bloom text-white hover:bg-bloom-ink rounded-lg text-sm font-semibold mt-1 disabled:opacity-60"
    >
      {pending ? "Đang xử lý…" : label}
    </button>
  );
}

function TextField({
  name,
  label,
  type = "text",
  required,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-semibold text-[#4A4A4A] mb-1.5 block">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="w-full h-11 border border-line rounded-lg px-3.5 text-sm outline-none focus:border-bloom"
      />
    </label>
  );
}

export function CustomerAuthForm({
  mode,
  next,
}: {
  mode: "login" | "register";
  next?: string;
}) {
  const action = mode === "login" ? customerLoginAction : registerCustomerAction;
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <input type="hidden" name="next" value={next ?? "/account"} />

      {mode === "register" && (
        <>
          <TextField name="name" label="Họ và tên" required autoComplete="name" />
          <TextField
            name="phone"
            label="Số điện thoại (tuỳ chọn)"
            autoComplete="tel"
          />
        </>
      )}
      <TextField
        name="email"
        label="Email"
        type="email"
        required
        autoComplete="email"
      />
      <TextField
        name="password"
        label={mode === "register" ? "Mật khẩu (tối thiểu 6 ký tự)" : "Mật khẩu"}
        type="password"
        required
        autoComplete={mode === "login" ? "current-password" : "new-password"}
      />

      {state?.error && (
        <p className="text-[12.5px] text-sale bg-[#FBEAEA] rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <Submit label={mode === "login" ? "Đăng nhập" : "Tạo tài khoản"} />

      <p className="text-[13px] text-muted text-center mt-1">
        {mode === "login" ? (
          <>
            Chưa có tài khoản?{" "}
            <Link
              href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="text-bloom font-semibold"
            >
              Đăng ký
            </Link>
          </>
        ) : (
          <>
            Đã có tài khoản?{" "}
            <Link
              href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="text-bloom font-semibold"
            >
              Đăng nhập
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
