import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { customerLogoutAction } from "@/lib/auth-actions";
import { db } from "@/lib/db";
import { formatVND, formatDateTime } from "@/lib/format";

export const metadata = { title: "Tài khoản" };

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  SOURCING: "Đang gom hàng",
  ARRIVED_VN: "Hàng về kho VN",
  AWAITING_BALANCE: "Chờ thu số dư",
  PACKING: "Đang đóng gói",
  HANDED_TO_CARRIER: "Đã giao ĐVVC",
  DELIVERING: "Đang giao",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã huỷ",
  RETURNED: "Trả hàng",
  REFUNDED: "Đã hoàn tiền",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const [orders, addresses] = await Promise.all([
    db.order.findMany({
      where: {
        OR: [{ userId: user.id }, { customerEmail: user.email }],
      },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
    db.address.findMany({ where: { userId: user.id } }),
  ]);

  const spent = orders
    .filter((o) => o.paymentStatus === "PAID")
    .reduce((s, o) => s + o.total, 0);

  return (
    <div className="mx-auto max-w-[960px] px-4 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Xin chào, {user.name}</h1>
          <p className="text-[13px] text-muted mt-1">{user.email}</p>
        </div>
        <form action={customerLogoutAction}>
          <button className="text-[13px] text-muted hover:text-sale border border-line rounded-lg px-3.5 h-9">
            Đăng xuất
          </button>
        </form>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-6">
        <Stat label="Đơn hàng" value={String(orders.length)} />
        <Stat label="Đã chi tiêu" value={formatVND(spent)} />
        <Stat label="Địa chỉ đã lưu" value={String(addresses.length)} />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold mb-3">Thông tin tài khoản</h2>
        <div className="bg-white border border-line rounded-card p-5 text-sm grid sm:grid-cols-2 gap-y-2.5 gap-x-8">
          <Field k="Họ và tên" v={user.name} />
          <Field k="Email" v={user.email} />
          <Field k="Số điện thoại" v={user.phone ?? "Chưa cập nhật"} />
          <Field k="Ngôn ngữ" v={user.locale === "ko" ? "한국어" : "Tiếng Việt"} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold mb-3">Sổ địa chỉ</h2>
        {addresses.length === 0 ? (
          <div className="bg-white border border-line rounded-card p-5 text-sm text-muted">
            Chưa có địa chỉ nào — địa chỉ sẽ được lưu khi bạn đặt hàng.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {addresses.map((a) => (
              <div
                key={a.id}
                className="bg-white border border-line rounded-card p-4 text-[13px] leading-relaxed"
              >
                <b>{a.fullName}</b> · {a.phone}
                {a.isDefault && (
                  <span className="ml-2 text-[11px] text-bloom bg-[#E7F1FA] px-2 py-0.5 rounded">
                    Mặc định
                  </span>
                )}
                <br />
                {a.line1}, {a.ward}, {a.district}, {a.province}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold mb-3">Đơn hàng của tôi</h2>
        <div className="flex flex-col gap-3">
          {orders.length === 0 && (
            <div className="bg-white border border-line rounded-card p-6 text-center">
              <p className="text-sm text-muted">Bạn chưa có đơn hàng nào.</p>
              <Link
                href="/products"
                className="inline-flex mt-4 h-11 px-6 items-center rounded-lg bg-bloom text-white hover:bg-bloom-ink text-sm font-semibold"
              >
                Bắt đầu mua sắm
              </Link>
            </div>
          )}
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/account/orders/${o.code}`}
              className="bg-white border border-line rounded-card p-5 hover:border-bloom transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <b>#{o.code}</b>
                  <span className="text-[12px] text-muted-2 ml-2">
                    {formatDateTime(o.createdAt)}
                  </span>
                </div>
                <span className="text-[11.5px] font-semibold px-2 py-1 rounded-full bg-surface text-muted">
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
              <div className="text-[13px] text-muted mt-1.5 line-clamp-1">
                {o.items.map((i) => i.productName).join(", ")}
              </div>
              <div className="text-sm font-bold mt-1.5">
                {formatVND(o.total)}
                {o.balanceAmount > 0 && (
                  <span className="text-[12px] text-sale font-medium ml-2">
                    · còn lại {formatVND(o.balanceAmount)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-line rounded-card p-4">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <span className="text-muted-2">{k}: </span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
