import { SiteHeader } from "@/components/shop/site-header";
import { SiteFooter } from "@/components/shop/site-footer";
import { getCartCount } from "@/lib/cart";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cartCount = await getCartCount();
  return (
    <>
      <SiteHeader cartCount={cartCount} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
