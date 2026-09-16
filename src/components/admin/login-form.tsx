"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/lib/auth-actions";

function Submit({ labels }: { labels: L }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full h-11 bg-bloom text-white hover:bg-bloom-ink rounded-lg text-sm font-semibold mt-2 disabled:opacity-60"
    >
      {pending ? labels.loading : labels.submit}
    </button>
  );
}

type L = { email: string; password: string; submit: string; loading: string };

export function LoginForm({ next, labels }: { next?: string; labels: L }) {
  const [state, formAction] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <input type="hidden" name="next" value={next ?? "/admin"} />
      <label className="block">
        <span className="text-[12.5px] font-semibold text-[#4A4A4A] mb-1.5 block">
          {labels.email}
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="w-full h-11 border border-line rounded-lg px-3.5 text-sm outline-none focus:border-bloom"
        />
      </label>
      <label className="block">
        <span className="text-[12.5px] font-semibold text-[#4A4A4A] mb-1.5 block">
          {labels.password}
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full h-11 border border-line rounded-lg px-3.5 text-sm outline-none focus:border-bloom"
        />
      </label>
      {state?.error && (
        <p className="text-[12.5px] text-sale bg-[#FBEAEA] rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      <Submit labels={labels} />
    </form>
  );
}
