import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { STAFF_ROLE_KEYS } from "@/lib/rbac";
import { formatVND, formatDateTime } from "@/lib/format";

export const metadata = { title: "Theo dõi đơn hàng" };

const FLOW = [
  ["PENDING", "Chờ xác nhận"],
  ["CONFIRMED", "Đã xác nhận"],
  ["PACKING", "Đang đóng gói"],
  ["HANDED_TO_CARRIER", "Đã giao ĐVVC"],
  ["DELIVERING", "Đang giao"],
  ["COMPLETED", "Hoàn tất"],
] as const;

export default async function OrderTrackingPage(props: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await props.params;
  const order = await db.order.findUnique({
    where: { code },
    include: { items: true, payments: true, shipment: true },
  });
  if (!order) notFound();

  // Kiểm tra quyền xem: chủ đơn, cùng email, hoặc nhân viên.
  const user = await getCurrentUser();
  const isStaff = !!user && STAFF_ROLE_KEYS.includes(user.role.key);
  const isOwner =
    !!user &&
    (order.userId === user.id ||
      (order.customerEmail && order.customerEmail === user.email));
  if (order.userId && !isOwner && !isStaff) notFound();

  const currentIdx = FLOW.findIndex(([s]) => s === order.status);

  return (
    <div className="mx-auto max-w-[720px] px-4 py-10">
      <Link href="/account" className="text-[13px] text-muted">
        ← Đơn hàng của tôi
      </Link>
      <h1 className="text-xl font-bold mt-3">Đơn #{order.code}</h1>
      <p className="text-[13px] text-muted mt-1">
        Đặt lúc {formatDateTime(order.createdAt)}
      </p>

      <div className="border border-line rounded-card p-6 mt-6">
        <div className="flex flex-col gap-4">
          {FLOW.map(([s, label], i) => {
            const done = currentIdx >= 0 && i <= currentIdx;
            return (
              <div key={s} className="flex items-center gap-3">
                <span
                  className={`w-3.5 h-3.5 rounded-full ${
                    done ? "bg-bloom" : "bg-[#E6E6E0]"
                  }`}
                />
                <span
                  className={`text-[13.5px] ${done ? "font-semibold" : "text-muted-2"}`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        {order.shipment?.trackingCode && (
          <div className="mt-4 pt-4 border-t border-line text-[13px]">
            Mã vận đơn <b>{order.shipment.trackingCode}</b> ·{" "}
            {order.shippingCarrier}
          </div>
        )}
      </div>

      <div className="border border-line rounded-card p-6 mt-4">
        <div className="text-sm font-bold mb-3">Sản phẩm</div>
        {order.items.map((it) => (
          <div key={it.id} className="flex justify-between text-[13px] mb-2">
            <span>
              {it.productName}{" "}
              <span className="text-muted-2">
                ({it.variantName}) ×{it.quantity}
              </span>
            </span>
            <span className="font-semibold">
              {formatVND(it.unitPrice * it.quantity)}
            </span>
          </div>
        ))}
        <div className="border-t border-line mt-3 pt-3 text-[13px]">
          <div className="flex justify-between mb-1">
            <span className="text-muted">Tổng giá trị đơn</span>
            <b>{formatVND(order.total)}</b>
          </div>
          {order.depositRate > 0 && (
            <>
              <div className="flex justify-between mb-1">
                <span className="text-muted">Đã đặt cọc ({order.depositRate}%)</span>
                <b className="text-bloom">{formatVND(order.depositAmount)}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Còn lại — khi hàng về</span>
                <b className="text-sale">{formatVND(order.balanceAmount)}</b>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
