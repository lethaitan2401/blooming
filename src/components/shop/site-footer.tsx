import Link from "next/link";
import Image from "next/image";
import { getDictionary, getLocale } from "@/lib/i18n";
import logo from "../../../public/brand/logo.png";

export async function SiteFooter() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <footer className="mx-auto w-full max-w-[1440px] px-4 md:px-16 pt-16 pb-10 mt-14 border-t border-line">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pt-6">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <Image
              src={logo}
              alt="Blooming"
              width={44}
              height={44}
              className="w-11 h-11 rounded-full object-cover"
            />
            <span className="text-[22px] font-bold tracking-tight text-bloom">
              Blooming
            </span>
          </div>
          <p className="text-[13px] text-muted leading-relaxed mt-3.5 max-w-[260px]">
            {t("footer.tagline")}
          </p>
          <p className="text-[13px] text-bloom font-medium mt-3">
            Bloom with you ♡ — beauty that keeps blooming
          </p>
        </div>
        <FooterCol
          title={t("footer.shop")}
          links={["Bán chạy", "Hàng mới về", "Khuyến mãi", "Thương hiệu"]}
        />
        <FooterCol
          title={t("footer.support")}
          links={[
            "Chính sách vận chuyển",
            "Đổi trả & hoàn tiền",
            "Hướng dẫn đặt hàng",
            "Câu hỏi thường gặp",
          ]}
        />
        <FooterCol
          title={t("footer.about")}
          links={["Giới thiệu", "Blog làm đẹp", "Tuyển dụng", "Liên hệ"]}
        />
        <FooterCol
          title="Kết nối"
          links={["Facebook", "Instagram", "TikTok", "Zalo OA"]}
        />
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-10 pt-6 border-t border-line">
        <span className="text-[12.5px] text-muted-2">
          © {new Date().getFullYear()} Blooming — Order chính hãng từ Hàn Quốc · Giao hàng toàn quốc
        </span>
        <div className="flex gap-2">
          {["VNPAY", "MoMo", "ZaloPay", "COD"].map((p) => (
            <span
              key={p}
              className="text-[11px] font-bold text-muted border border-line rounded-md px-2.5 py-1.5"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="text-[13px] font-bold mb-3.5">{title}</h4>
      {links.map((l) => (
        <Link
          key={l}
          href="#"
          className="block text-[13px] text-muted mb-2.5 hover:text-foreground transition-colors"
        >
          {l}
        </Link>
      ))}
    </div>
  );
}
