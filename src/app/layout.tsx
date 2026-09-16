import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Blooming — K-Beauty Direct Purchase Agency",
    template: "%s | Blooming",
  },
  description:
    "Blooming — order hộ mỹ phẩm chính hãng từ Hàn Quốc. Skincare, trang điểm chính hãng, đẹp tự nhiên, tự tin tỏa sáng.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
