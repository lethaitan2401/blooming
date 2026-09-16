import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth";
import { CustomerAuthForm } from "@/components/shop/customer-auth-form";

export const metadata = { title: "Tạo tài khoản" };

export default async function RegisterPage(props: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await props.searchParams;
  const session = await getSessionPayload();
  if (session) redirect(next && next.startsWith("/") ? next : "/account");

  return (
    <div className="mx-auto max-w-[400px] px-4 py-14">
      <h1 className="text-2xl font-bold text-center">Tạo tài khoản Blooming</h1>
      <p className="text-[13px] text-muted text-center mt-1.5 mb-6">
        Thành viên mới — đơn đầu tiên được tặng kèm mẫu thử.
      </p>
      <div className="bg-white border border-line rounded-card p-6">
        <CustomerAuthForm mode="register" next={next} />
      </div>
    </div>
  );
}
