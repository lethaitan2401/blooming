import Link from "next/link";
import { getCart } from "@/lib/cart";
import { getLocale, productName } from "@/lib/i18n";
import { effectivePrice, formatVND } from "@/lib/format";
import { setCartItemQtyAction, removeCartItemAction } from "@/lib/actions";
import { getSampleThreshold, getProductNameLang } from "@/lib/settings";
import { PlaceholderImage } from "@/components/shop/placeholder-image";

export const metadata = { title: "Giỏ hàng" };

export default async function CartPage() {
  const cart = await getCart();
  const locale = await getLocale();
  const nameLang = await getProductNameLang();
  const items = cart?.items ?? [];

  const lines = items.map((it) => {
    const eff = effectivePrice(it.variant);
    return {
      id: it.id,
      qty: it.quantity,
      name: productName(locale, nameLang, it.variant.product),
      variantName: it.variant.name,
      tint: it.variant.product.images[0]?.tint ?? "#EFEBE3",
      unit: eff.price,
      lineTotal: eff.price * it.quantity,
      preorder: it.variant.product.orderType === "PREORDER",
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const hasPreorder = lines.some((l) => l.preorder);
  const sampleThreshold = await getSampleThreshold();
  const giftSample = subtotal > 0 && subtotal >= sampleThreshold;

  return (
    <div className="mx-auto max-w-[1440px] px-4 md:px-16 py-8">
      <h1 className="text-[28px] font-bold tracking-tight">Giỏ hàng</h1>

      {lines.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-muted">Giỏ hàng trống.</p>
          <Link
            href="/products"
            className="inline-flex mt-4 h-11 px-6 items-center rounded-lg bg-bloom text-white hover:bg-bloom-ink text-sm font-semibold"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-[1fr_360px] gap-8 mt-6">
          <div className="flex flex-col divide-y divide-line border-y border-line">
            {lines.map((l) => (
              <div key={l.id} className="flex gap-4 py-5">
                <PlaceholderImage
                  tint={l.tint}
                  iconSize={26}
                  className="w-20 h-20 rounded-lg shrink-0"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium leading-snug">{l.name}</div>
                  <div className="text-xs text-muted-2 mt-1">
                    Phân loại: {l.variantName}
                    {l.preorder && (
                      <span className="ml-2 text-bloom">· Đặt trước</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <form
                      action={async () => {
                        "use server";
                        await setCartItemQtyAction(l.id, l.qty - 1);
                      }}
                    >
                      <button className="w-8 h-8 border border-line rounded-md text-muted">
                        −
                      </button>
                    </form>
                    <span className="text-sm font-semibold w-6 text-center">
                      {l.qty}
                    </span>
                    <form
                      action={async () => {
                        "use server";
                        await setCartItemQtyAction(l.id, l.qty + 1);
                      }}
                    >
                      <button className="w-8 h-8 border border-line rounded-md text-muted">
                        +
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await removeCartItemAction(l.id);
                      }}
                      className="ml-2"
                    >
                      <button className="text-xs text-muted-2 hover:text-sale">
                        Xoá
                      </button>
                    </form>
                  </div>
                </div>
                <div className="text-sm font-bold whitespace-nowrap">
                  {formatVND(l.lineTotal)}
                </div>
              </div>
            ))}
          </div>

          <div className="border border-line rounded-card p-6 h-fit">
            <div className="text-base font-bold mb-4">
              Tóm tắt ({lines.length} sản phẩm)
            </div>
            <div className="flex justify-between text-[13.5px] mb-2.5">
              <span className="text-muted">Tạm tính</span>
              <span>{formatVND(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[13.5px] mb-2.5">
              <span className="text-muted">Phí ship từ Hàn Quốc</span>
              <span className="text-muted-2">Theo kg · báo sau</span>
            </div>
            {giftSample ? (
              <div className="text-[12px] text-[#134D73] bg-[#E7F1FA] rounded-lg px-3 py-2 my-3">
                🎁 Đơn được tặng mẫu thử kèm khi giao.
              </div>
            ) : (
              subtotal > 0 && (
                <div className="text-[12px] text-muted bg-surface rounded-lg px-3 py-2 my-3">
                  Mua thêm {formatVND(sampleThreshold - subtotal)} để được tặng
                  mẫu thử.
                </div>
              )
            )}
            {hasPreorder && (
              <div className="text-[12px] text-bloom bg-[#E7F1FA] rounded-lg px-3 py-2 my-3">
                Đơn có hàng đặt trước — sẽ yêu cầu đặt cọc ở bước thanh toán.
              </div>
            )}
            <div className="flex justify-between items-baseline border-t border-line mt-3 pt-3.5">
              <span className="text-[15px] font-bold">Tổng cộng</span>
              <span className="text-xl font-bold">{formatVND(subtotal)}</span>
            </div>
            <Link
              href="/checkout"
              className="mt-4 w-full h-[52px] bg-bloom text-white hover:bg-bloom-ink rounded-lg font-semibold text-[15px] flex items-center justify-center"
            >
              Thanh toán
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
