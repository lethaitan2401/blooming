"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  ClipboardList,
  Package,
  Warehouse,
  Truck,
  Tag,
  Users,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
} from "lucide-react";
import { logoutAction } from "@/lib/auth-actions";
import { useAdminT, AdminLangToggle } from "./admin-i18n";
import type { AdminKey } from "@/lib/admin-i18n";
import logo from "../../../public/brand/logo.png";

const NAV: { href: string; key: AdminKey; icon: typeof LayoutGrid; exact?: boolean }[] = [
  { href: "/admin", key: "nav.dashboard", icon: LayoutGrid, exact: true },
  { href: "/admin/orders", key: "nav.orders", icon: ClipboardList },
  { href: "/admin/products", key: "nav.products", icon: Package },
  { href: "/admin/inventory", key: "nav.inventory", icon: Warehouse },
  { href: "/admin/shipments", key: "nav.shipments", icon: Truck },
  { href: "/admin/promotions", key: "nav.promotions", icon: Tag },
  { href: "/admin/customers", key: "nav.customers", icon: Users },
  { href: "/admin/reports", key: "nav.reports", icon: BarChart3 },
  { href: "/admin/roles", key: "nav.roles", icon: ShieldCheck },
  { href: "/admin/settings", key: "nav.settings", icon: Settings },
];

export function AdminSidebar({
  userName,
  allowed,
}: {
  userName: string;
  allowed: string[];
}) {
  const pathname = usePathname();
  const t = useAdminT();
  const visible = NAV.filter((n) => allowed.includes(n.href));

  return (
    <aside className="w-[240px] shrink-0 bg-white border-r border-line px-4 py-5 flex flex-col min-h-screen">
      <div className="flex items-center gap-2 px-2 pb-5">
        <Image
          src={logo}
          alt="Blooming"
          width={30}
          height={30}
          className="w-[30px] h-[30px] rounded-full object-cover"
        />
        <span className="text-lg font-bold text-bloom tracking-tight">Blooming</span>
        <span className="text-[11px] text-muted-2 font-medium">admin</span>
        <div className="ml-auto">
          <AdminLangToggle />
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {visible.map((n) => {
          const active = n.exact
            ? pathname === n.href
            : pathname.startsWith(n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13.5px] transition-colors ${
                active
                  ? "bg-[#E7F1FA] text-bloom font-semibold"
                  : "text-[#4A4A4A] font-medium hover:bg-surface"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-bloom" />
              )}
              <Icon
                size={17}
                strokeWidth={1.8}
                className={active ? "text-bloom" : "text-[#6B6B6B]"}
              />
              {t(n.key)}
            </Link>
          );
        })}
      </nav>

      <form action={logoutAction} className="mt-auto pt-4">
        <div className="px-3.5 pb-2 text-[11px] text-muted-2">{userName}</div>
        <button className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13.5px] font-medium text-muted hover:bg-surface w-full">
          <LogOut size={17} strokeWidth={1.7} />
          {t("nav.signOut")}
        </button>
      </form>
    </aside>
  );
}
