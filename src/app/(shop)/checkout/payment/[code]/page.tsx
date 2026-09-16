import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatVND } from "@/lib/format";
import { getBankInfo, vietQrUrl } from "@/lib/settings";
import { markTransferReportedAction } from "@/lib/actions";
import { CopyHint } from "@/components/shop/copy-hint";

export const metadata = { title: "Chuyển khoản đặt cọc" };

export default async function PaymentPage(props: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await props.params;
  const order = await db.order.findUnique({
    where: { code },
    include: { payments: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) notFound();

  const pay = order.payments.find((p) => p.provider === "BANK_TRANSFER");
  const amount = pay?.amount ?? (order.depositAmount || order.total);
  const isDeposit = order.depositRate > 0;
  const bank = await getBankInfo();
  const content = order.code; // nội dung chuyển khoản
  const qr = vietQrUrl(bank, amount, content, "compact2");
  const done = !!pay?.reportedAt || pay?.status === "PAID";

  return (
    <div className="mx-auto max-w-[560px] px-4 py-12">
      <h1 className="text-xl font-bold text-center">
        {isDeposit ? "Chuyển khoản tiền cọc" : "Chuyển khoản thanh toán"}
      </h1>
      <p className="text-[13px] text-muted text-center mt-1.5">
        Đơn <b className="text-foreground">#{order.code}</b> · quét mã hoặc chuyển
        theo thông tin dưới đây.
      </p>

      <div className="border border-line rounded-card p-5 mt-6 flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qr}
          alt={`VietQR ${bank.bankName}`}
          width={300}
          height={420}
          className="w-[280px] max-w-full rounded-lg border border-line"
        />
        <p className="text-[11.5px] text-muted-2 mt-2">
          Mở app ngân hàng bất kỳ · quét QR · số tiền & nội dung điền sẵn.
        </p>
      </div>

      <div className="border border-line rounded-card mt-4 divide-y divide-line text-[13.5px]">
        <Row k="Ngân hàng" v={bank.bankName} />
        <Row k="Chủ tài khoản" v={bank.holder} />
        <Row k="Số tài khoản" v={bank.account} copy />
        <Row
          k={isDeposit ? `Số tiền cọc (${order.depositRate}%)` : "Số tiền"}
          v={formatVND(amount)}
          strong
        />
        <Row k="Nội dung chuyển khoản" v={content} copy />
      </div>

      {isDeposit && (
        <p className="text-[12px] text-muted mt-3 leading-relaxed">
          Phần còn lại <b>{formatVND(order.balanceAmount)}</b> sẽ được nhắc thanh
          toán khi hàng về kho VN.
        </p>
      )}

      <div className="bg-[#FBF3E6] border border-[#F0E4CB] rounded-lg px-4 py-3 mt-4 text-[12px] text-[#7A5B1E] leading-relaxed">
        ⚠ <b>Ghi đúng nội dung</b> <b>{content}</b> để đơn được đối soát tự động.
        Đơn xử lý sau khi Blooming xác nhận đã nhận tiền (thường trong vài giờ).
      </div>

      {done ? (
        <div className="mt-6 text-center">
          <p className="text-[13px] text-success font-semibold">
            ✓ Đã ghi nhận. Chờ Blooming xác nhận nhận tiền.
          </p>
          <Link
            href={`/account/orders/${order.code}`}
            className="inline-flex h-11 px-6 mt-3 rounded-lg bg-bloom text-white hover:bg-bloom-ink text-sm font-semibold items-center"
          >
            Xem đơn hàng
          </Link>
        </div>
      ) : (
        <form action={markTransferReportedAction} className="mt-6">
          <input type="hidden" name="code" value={order.code} />
          <button className="w-full h-12 rounded-lg bg-bloom text-white hover:bg-bloom-ink text-[14px] font-semibold">
            Tôi đã chuyển khoản
          </button>
          <Link
            href="/products"
            className="block text-center text-[12.5px] text-muted mt-3"
          >
            Chuyển sau — về trang sản phẩm
          </Link>
        </form>
      )}
    </div>
  );
}

function Row({
  k,
  v,
  strong,
  copy,
}: {
  k: string;
  v: string;
  strong?: boolean;
  copy?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-muted">{k}</span>
      <span className={`text-right ${strong ? "font-bold text-[15px]" : "font-semibold"}`}>
        {v}
        {copy && <CopyHint text={v} />}
      </span>
    </div>
  );
}
