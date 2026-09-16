# Blooming — Mỹ phẩm chính hãng (Bến Tre)

Trang bán hàng mỹ phẩm + khu quản trị đơn hàng / doanh thu / giao nhận.
Tham khảo GUI theo phong cách Olive Young.

**Stack:** Next.js 16 (App Router, Turbopack) · PostgreSQL + Prisma 6 · Tailwind v4 ·
Auth session tự viết (jose + bcryptjs) · thị trường Việt Nam (VND, VNPay/MoMo/ZaloPay/COD,
GHN/GHTK).

Xem `CLAUDE.md` để biết danh sách tính năng đầy đủ, cập nhật (đặt cọc theo %/số
tiền, thanh toán VietQR, phí ship Hàn theo kg, tên SP song ngữ VI/EN...).

## Bắt đầu

```bash
# 1. Postgres (Docker) — cổng host 5433 (khác OliuGUI để chạy song song được)
npm run db:up

# 2. Migration + dữ liệu mẫu
npm run db:migrate
npm run db:seed

# 3. Chạy
npm run dev          # http://localhost:3000
```

Yêu cầu: Node ≥ 20.9, Docker.

## Tài khoản demo (khu admin `/admin/login`)

| Email | Mật khẩu | Vai trò |
|---|---|---|
| admin@blooming.vn | blooming12345 | Super Admin |
| tan.lethaitan@gmail.com | blooming12345 | Super Admin (acc của bạn) |
| manager@blooming.vn | blooming12345 | Quản lý (đăng & duyệt giá) |
| sanpham@blooming.vn | blooming12345 | NV Sản phẩm (đăng giá → chờ duyệt) |
| donhang@blooming.vn | blooming12345 | NV Đơn hàng |
| ketoan@blooming.vn | blooming12345 | Kế toán (bị khoá — để test) |

Khách hàng demo (`/login`): `trang@example.com` / `blooming12345` — hoặc tự **đăng ký** ở `/register`.

**Phân quyền admin** enforce theo từng trang qua session (`guardAdmin` + bảng `ADMIN_ACCESS`):
sidebar tự ẩn mục không có quyền, vào thẳng URL thiếu quyền → `/admin/forbidden`.
`/admin/roles` (phân quyền) chỉ **Super Admin + Quản lý** vào được.

## Tính năng đã có

**Storefront:** trang chủ (banner + rail bán chạy / hàng mới), danh sách sản phẩm có
lọc & sắp xếp, chi tiết sản phẩm (chọn biến thể, giá KM, đánh giá), giỏ hàng,
**thanh toán có đặt cọc** cho hàng đặt trước (30/50/70%), theo dõi đơn, chuyển
**Tiếng Việt ⇄ Tiếng Hàn**.

**Admin:** dashboard KPI (doanh thu, đơn, AOV, top SP, cảnh báo tồn, tỉ trọng kênh
thanh toán), danh sách + chi tiết đơn (timeline, tạo vận đơn mock, khối đặt cọc),
**sửa danh sách sản phẩm inline** (giá bán / giá KM / tồn / trạng thái), **phân quyền**
với ma trận quyền + luồng **đăng giá / duyệt giá**.

## Scripts

| Lệnh | Việc |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Build production |
| `npm run db:up` / `db:down` | Bật/tắt Postgres |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:reset` | Reset DB + seed |
| `npm run db:seed` | Seed dữ liệu mẫu |
| `npm run db:studio` | Prisma Studio |

Xem lộ trình đầy đủ ở kế hoạch dự án (feature list, kiến trúc, các phase).
