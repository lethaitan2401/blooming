import Link from "next/link";
import { guardAdmin } from "@/lib/admin-guard";

export const metadata = { title: "Không có quyền" };

export default async function ForbiddenPage() {
  const user = await guardAdmin(); // vẫn cần là nhân viên
  return (
    <div className="p-6 md:p-8">
      <div className="bg-white border border-line rounded-card p-10 text-center max-w-[520px] mx-auto mt-10">
        <div className="w-14 h-14 rounded-full bg-[#FBF3E6] flex items-center justify-center mx-auto">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#B57A17" strokeWidth="2">
            <path d="M12 3l7 3v6c0 4-3 7-7 8-4-1-7-4-7-8V6z" />
            <path d="M12 9v4M12 16h.01" />
          </svg>
        </div>
        <h1 className="text-xl font-bold mt-4">Bạn không có quyền truy cập mục này</h1>
        <p className="text-sm text-muted mt-2">
          Tài khoản <b>{user.name}</b> đang có vai trò{" "}
          <b>{user.role.name}</b>. Liên hệ Quản lý / Super Admin nếu bạn cần
          thêm quyền.
        </p>
        <Link
          href="/admin"
          className="inline-flex mt-6 h-10 px-5 items-center rounded-lg bg-bloom text-white hover:bg-bloom-ink text-sm font-semibold"
        >
          Về Tổng quan
        </Link>
      </div>
    </div>
  );
}
