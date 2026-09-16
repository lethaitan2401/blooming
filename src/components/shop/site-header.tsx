import Link from "next/link";
import Image from "next/image";
import { LangSwitcher } from "./lang-switcher";
import { AccountMenu } from "./account-menu";
import { getDictionary, getLocale } from "@/lib/i18n";
import { getSessionPayload } from "@/lib/auth";
import logo from "../../../public/brand/logo.png";

const NAV: { key: Parameters<ReturnType<typeof getDictionary>>[0]; href: string; strong?: boolean; sale?: boolean }[] = [
  { key: "nav.best", href: "/products?tag=best", strong: true },
  { key: "nav.new", href: "/products?tag=new" },
  { key: "nav.skincare", href: "/products?category=skincare" },
  { key: "nav.makeup", href: "/products?category=trang-diem" },
  { key: "nav.lip", href: "/products?category=son-moi" },
  { key: "nav.mask", href: "/products?category=mat-na" },
  { key: "nav.suncare", href: "/products?category=chong-nang" },
  { key: "nav.supplement", href: "/products?category=thuc-pham-chuc-nang" },
  { key: "nav.brands", href: "/brands" },
  { key: "nav.sale", href: "/products?onSale=1", sale: true },
];

export async function SiteHeader({ cartCount = 0 }: { cartCount?: number }) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const session = await getSessionPayload();

  return (
    <header className="w-full">
      <div className="h-9 bg-bloom text-white flex items-center justify-center text-[12.5px]">
        {t("header.freeship")}
      </div>

      <div className="mx-auto max-w-[1440px] px-4 md:px-16 h-[86px] flex items-center gap-6 md:gap-10 border-b border-line">
        <Link href="/" className="shrink-0 flex items-center gap-2.5">
          <Image
            src={logo}
            alt="Blooming"
            width={48}
            height={48}
            priority
            className="w-12 h-12 rounded-full object-cover"
          />
          <span className="text-2xl font-bold tracking-tight text-bloom hidden sm:block">
            Blooming
          </span>
        </Link>

        <form
          action="/products"
          className="flex-1 max-w-[560px] hidden sm:flex items-center h-[46px] border-[1.5px] border-bloom rounded-lg px-3.5 gap-2.5"
        >
          <button type="submit" aria-label="Tìm" className="shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.5-4.5" />
            </svg>
          </button>
          <input
            name="q"
            type="search"
            className="w-full text-sm outline-none placeholder:text-muted-2"
            placeholder={t("header.searchPlaceholder")}
          />
        </form>

        <div className="flex items-center gap-5 md:gap-[22px] ml-auto text-foreground">
          <LangSwitcher current={locale} />
          <AccountMenu
            name={session?.name}
            labels={{
              account: t("header.account"),
              signIn: locale === "ko" ? "로그인" : "Đăng nhập",
              orders: locale === "ko" ? "주문 내역" : "Đơn hàng của tôi",
              profile: locale === "ko" ? "내 계정" : "Thông tin tài khoản",
              signOut: locale === "ko" ? "로그아웃" : "Đăng xuất",
            }}
          />
          <Link href="/wishlist" className="flex flex-col items-center gap-[3px]">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 20s-7-4.5-9.5-9C1 8 2.5 4.5 6 4.5c2 0 3.4 1.2 4 2.3.6-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 15.5 12 20 12 20z" />
            </svg>
            <span className="text-[10.5px] text-muted">{t("header.wishlist")}</span>
          </Link>
          <Link href="/cart" className="relative flex flex-col items-center gap-[3px]">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 8h12l-1 12H7L6 8z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 right-1.5 bg-sale text-white text-[9px] font-bold w-[15px] h-[15px] rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
            <span className="text-[10.5px] text-muted">{t("header.cart")}</span>
          </Link>
        </div>
      </div>

      <nav className="mx-auto max-w-[1440px] px-4 md:px-16 h-[52px] flex items-center gap-5 md:gap-7 border-b border-line overflow-x-auto no-scrollbar">
        {NAV.map((n) => (
          <Link
            key={n.key}
            href={n.href}
            className={`text-sm whitespace-nowrap transition-colors ${
              n.strong ? "font-bold" : "font-medium"
            } ${n.sale ? "text-sale hover:text-sale ml-auto" : "hover:text-bloom"}`}
          >
            {t(n.key)}
          </Link>
        ))}
      </nav>
    </header>
  );
}
