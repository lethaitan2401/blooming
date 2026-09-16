import Image from "next/image";
import { LoginForm } from "@/components/admin/login-form";
import { adminT } from "@/lib/admin-i18n";
import { getLocale } from "@/lib/i18n";
import logo from "../../../../public/brand/logo.png";

export const metadata = { title: "Blooming Admin" };

export default async function AdminLoginPage(props: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await props.searchParams;
  const t = adminT(await getLocale());

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <Image
            src={logo}
            alt="Blooming"
            width={44}
            height={44}
            className="w-11 h-11 rounded-full object-cover"
          />
          <span className="text-xl font-bold text-bloom">Blooming</span>
          <span className="text-[11px] text-muted-2 font-medium">admin</span>
        </div>
        <div className="bg-white border border-line rounded-card p-7">
          <h1 className="text-lg font-bold">{t("login.submit")}</h1>
          <p className="text-[13px] text-muted mt-1 mb-5">
            {t("login.subtitle")}
          </p>
          <LoginForm next={next} labels={{ email: "Email", password: t("login.password"), submit: t("login.submit"), loading: t("login.loading") }} />
        </div>
        <p className="text-[12px] text-muted-2 text-center mt-4">
          {t("login.demoAccount")}: <b>admin@blooming.vn</b> / <b>blooming12345</b>
        </p>
      </div>
    </div>
  );
}
