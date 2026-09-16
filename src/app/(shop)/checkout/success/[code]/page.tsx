import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";

export const metadata = { title: "Đặt hàng thành công" };

export default async function SuccessPage(props: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await props.params;
  const order = await db.order.findUnique({
    where: { code },
    include: { items: true, payments: true },
  });
  if (!order) notFound();

  const isDeposit = order.depositRate > 0;

  return (
    <div className="mx-auto max-w-[640px] px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-[#E7F1FA] flex items-center justify-center mx-auto">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2E7D46" strokeWidth="2.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold mt-5">Đặt hàng thành công!</h1>
      <p className="text-muted mt-2">
        Mã đơn <b className="text-foreground">#{order.code}</b> — chúng tôi đã gửi
        xác nhận qua email{order.customerEmail ? ` (${order.customerEmail})` : ""}.
      </p>

      <div className="border border-line rounded-card p-6 mt-8 text-left text-sm">
        <div className="flex justify-between py-1.5">
          <span className="text-muted">Tổng giá trị đơn</span>
          <b>{formatVND(order.total)}</b>
        </div>
        {isDeposit ? (
          <>
            <div className="flex justify-between py-1.5">
              <span className="text-muted">Đã đặt cọc ({order.depositRate}%)</span>
              <b className="text-bloom">{formatVND(order.depositAmount)}</b>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted">Còn lại — khi hàng về VN</span>
              <b className="text-sale">{formatVND(order.balanceAmount)}</b>
            </div>
            <p className="text-xs text-muted mt-3">
              Đơn đặt trước — dự kiến hàng về trong 12–18 ngày. Chúng tôi sẽ nhắc
              bạn thanh toán phần còn lại khi hàng về kho.
            </p>
          </>
        ) : (
          <div className="flex justify-between py-1.5">
            <span className="text-muted">Thanh toán</span>
            <b>{formatVND(order.total)}</b>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-center mt-8">
        <Link
          href="/products"
          className="h-11 px-6 rounded-lg border border-bloom text-sm font-semibold flex items-center"
        >
          Tiếp tục mua sắm
        </Link>
        <Link
          href={`/account/orders/${order.code}`}
          className="h-11 px-6 rounded-lg bg-bloom text-white hover:bg-bloom-ink text-sm font-semibold flex items-center"
        >
          Xem đơn hàng
        </Link>
      </div>
    </div>
  );
}
