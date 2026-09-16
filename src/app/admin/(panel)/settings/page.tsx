import { guardAdmin } from "@/lib/admin-guard";
import { ADMIN_ACCESS } from "@/lib/rbac";
import { adminT } from "@/lib/admin-i18n";
import { getLocale } from "@/lib/i18n";
import {
  getBankInfo,
  getKrwRate,
  getShowPrices,
  getSampleThreshold,
  getKrShipPerKg,
  getProductNameLang,
} from "@/lib/settings";
import { BankSettingsForm } from "@/components/admin/bank-settings-form";
import { PriceVisibilityToggle } from "@/components/admin/price-visibility-toggle";
import { ProductNameLangToggle } from "@/components/admin/product-name-lang-toggle";
import { ShippingPromoForm } from "@/components/admin/shipping-promo-form";

export const metadata = { title: "Blooming Admin" };

export default async function Page() {
  await guardAdmin(ADMIN_ACCESS["/admin/settings"]);
  const t = adminT(await getLocale());
  const [bank, krw, showPrices, sampleThreshold, krShipPerKg, nameLang] =
    await Promise.all([
      getBankInfo(),
      getKrwRate(),
      getShowPrices(),
      getSampleThreshold(),
      getKrShipPerKg(),
      getProductNameLang(),
    ]);

  return (
    <div className="p-6 md:p-7">
      <h1 className="text-[22px] font-bold tracking-tight mb-5">
        {t("settings.title")}
      </h1>
      <PriceVisibilityToggle initial={showPrices} />
      <ProductNameLangToggle initial={nameLang} />
      <ShippingPromoForm
        sampleThreshold={sampleThreshold}
        krShipPerKg={krShipPerKg}
      />
      <BankSettingsForm bank={bank} />
      <p className="text-[12px] text-muted-2 mt-4">
        {t("settings.krwRate")}: <b>1 ₩ = {krw} ₫</b>
      </p>
    </div>
  );
}
