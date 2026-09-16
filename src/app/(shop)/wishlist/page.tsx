import Link from "next/link";

export const metadata = { title: "Yêu thích" };

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Danh sách yêu thích</h1>
      <p className="text-muted mt-3">
        Tính năng yêu thích sẽ có ở Phase 4 (cần đăng nhập khách hàng).
      </p>
      <Link
        href="/products"
        className="inline-flex mt-6 h-11 px-6 items-center rounded-lg bg-bloom text-white hover:bg-bloom-ink text-sm font-semibold"
      >
        Khám phá sản phẩm
      </Link>
    </div>
  );
}
