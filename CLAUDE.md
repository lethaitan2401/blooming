@AGENTS.md

# Blooming — trang bán hàng mỹ phẩm (K-beauty order từ Hàn) + admin

Web bán mỹ phẩm K-beauty theo mô hình **order hộ / mua giúp từ Hàn Quốc**
("Blooming — K-BEAUTY DIRECT PURCHASE AGENCY"), thương hiệu tông xanh dương,
nhân bản từ dự án chị em **OliuGUI** (cùng codebase/tính năng, khác bộ ảnh
thương hiệu + DB riêng). Next.js 16 (App Router, Turbopack) · PostgreSQL +
Prisma 6 · Tailwind v4 · Auth tự viết (jose + bcryptjs).

## Chạy dự án
```
npm run db:up          # Postgres qua Docker, cổng HOST 5433 (tránh đụng OliuGUI ở 5432)
npm run db:migrate     # áp migration
npm run db:seed        # roles, users, coupons, đơn mẫu + 16 SP placeholder
npm run catalog:build  # fetch nhiều nguồn Shopify (RETAILERS bulk + PRODUCTS chọn lọc),
                        # tải ảnh về public/products/<slug>/, ghi data/catalog.json
npm run catalog:import -- --replace-demo   # upsert theo slug, thay 16 SP placeholder
node scripts/vietnamize-names.mjs          # Việt hoá tên SP theo từ điển (lưu tên Anh vào nameEn)
npm run dev            # http://localhost:3000
```

Admin demo: `admin@blooming.vn` / `blooming12345` — đăng nhập tại `/admin/login`.
Vai trò khác cùng mật khẩu: `manager@`, `sanpham@`, `donhang@`, `ketoan@blooming.vn`.
Tài khoản `tan.lethaitan@gmail.com` cũng là super_admin (xem `prisma/seed.ts`).

## Khác gì với OliuGUI
- **Thương hiệu**: "Blooming" (logo hoa 6 cánh xanh dương), thay cho "OLiu" (olive
  xanh lá). Toàn bộ chuỗi "OLiu"/"oliu" đã đổi thành "Blooming"/"blooming" bằng
  script rebrand (xem lịch sử git commit đầu tiên).
- **Màu thương hiệu**: token CSS vẫn tên `--bloom` / `--bloom-ink` (giữ nguyên tên
  biến `bg-bloom`, `text-bloom`… trong toàn bộ component để không phải sửa hàng
  trăm chỗ) nhưng **giá trị đổi sang xanh dương**: `--bloom: #1d6fa5`,
  `--bloom-ink: #134d73` (globals.css). Các mảng tint nhạt "brand-light" cũng đổi
  từ xanh lá (`#EEF3EE`/`#DCE8DE`/`#33503A`) sang xanh dương
  (`#E7F1FA`/`#CFE3F3`/`#134D73`). Màu semantic khác (đỏ sale, vàng warning, xanh
  lá success, xanh dương info-badge cho trạng thái cọc) **giữ nguyên** — không
  phải màu thương hiệu.
- **Logo/banner**: `public/brand/logo.png` + `hero-banner.png` là ảnh Blooming
  riêng (nguồn gốc ở `images/IMG_3553.PNG` / `IMG_3551.PNG`).
- **Ảnh sản phẩm**: `public/products/` được tải **riêng** cho project này qua
  `catalog:build` — không dùng chung với OliuGUI dù cùng nguồn dữ liệu Shopify.
- **DB riêng**: container Docker `blooming-db`, port host **5433** (không phải
  5432 — OliuGUI đã chiếm cổng đó), user/db `blooming`. Cookie session/cart đổi
  tên `blooming_session` / `blooming_cart` để không đụng OliuGUI nếu chạy cùng
  trình duyệt lúc dev.
- **Mã đơn hàng**: prefix `BL` (vd `BL25891`) thay vì `OL`.
- Local `.env` đã có `DATABASE_URL` trỏ cổng 5433 + `AUTH_SECRET` tự sinh —
  **KHÔNG dùng chung** với `.env` của OliuGUI.
- **Chưa deploy** — dự án này mới có ở local, chưa tạo Vercel project / Neon DB
  production riêng (OliuGUI đang chạy ở oliu.vercel.app dùng Neon riêng).

## Tính năng đã có (đồng bộ từ OliuGUI, tính đến 2026-09-16)

### Storefront (khách)
- Trang chủ (banner + rail Bán chạy/Hàng mới), `/products` (lọc theo danh mục/
  thương hiệu/giá, tìm kiếm hoạt động qua `?q=`, phân trang gọn kiểu
  `‹ 1 … 4 5 6 … n ›`), `/product/[slug]` (gallery **bấm ảnh để phóng to** toàn
  màn hình), `/cart`, `/checkout`, `/checkout/success/[code]`,
  `/checkout/payment/[code]` (QR VietQR), `/account` (+ đơn của tôi), `/login`,
  `/register`, `/brands`, `/wishlist` (stub).
- **Đặt cọc khi checkout**: chọn theo **%** (30/50/70, tự nhập) **hoặc nhập số
  tiền cụ thể** — cả hai đều tính lại `depositRate`/`depositAmount`/
  `balanceAmount` nhất quán.
- **Thanh toán chuyển khoản VietQR**: `getBankInfo()`/`vietQrUrl()` trong
  `src/lib/settings.ts`; trang `/checkout/payment/[code]` hiện mã QR + nút
  "Tôi đã chuyển khoản" (`markTransferReportedAction`).
- **Ship nội địa miễn phí luôn**; phí ship Hàn → VN **tính theo kg, báo sau** —
  không cộng vào tổng lúc đặt, nhân viên nhập tay khi Sửa đơn (`shippingFee`
  trên `Order` = phí ship Hàn, không phải phí nội địa).
- **Khuyến mãi khách mới**: chỉ tặng mẫu thử khi đơn ≥ ngưỡng
  (`getSampleThreshold()`), **không** có mã giảm giá tiền mặt kiểu cũ.
- **Chế độ ẩn giá / xem tham khảo**: `getShowPrices()` — tắt thì ProductCard/
  PurchasePanel hiện "Giá: liên hệ", khoá `addToCartAction`/`placeOrderAction`.
- **Tên sản phẩm song ngữ VI/EN**: `Product.name` (VI, đã Việt hoá) +
  `Product.nameEn` (gốc Anh) + `Product.nameKo`; helper `productName(locale,
  nameLang, p)` trong `src/lib/i18n.ts` chọn theo locale (KO ưu tiên `nameKo`)
  và theo cấu hình `getProductNameLang()` (vi|en).

### Admin (`/admin`, guard 2 lớp: `proxy.ts` + `layout.tsx`, + `guardAdmin(ADMIN_ACCESS[href])` mỗi trang)
- Dashboard KPI, `/admin/products` (sửa giá/tồn/trạng thái inline, luồng
  `price.publish` → `PriceChangeRequest` chờ `price.approve` duyệt; bảng có
  **2 cột Tên (VI) / Tên (EN)**; form sửa SP có ô nhập cả hai tên).
- `/admin/orders`: danh sách + chi tiết đơn; **ảnh sản phẩm trong đơn bấm được
  để phóng to** (`ZoomImage`); khối **thanh toán**:
  - `BankTransferBox` — xác nhận đã nhận chuyển khoản VietQR
    (`confirmBankTransferAction`).
  - `PaymentQuickBox` — đổi nhanh Chưa/Đã cọc/Đã đủ + chọn **hình thức thanh
    toán** (Chuyển khoản/VNPAY/MoMo/ZaloPay/COD) cho đơn không qua VietQR.
  - **Sửa đơn** (`OrderEditForm` + `updateOrderAction`): sửa sản phẩm/địa chỉ/
    phí ship Hàn/giảm giá **và cả trạng thái + số tiền cọc** ngay trong 1 form
    (trước đây phải qua nhiều bước) — mọi input tiền dùng `step={1}` (tránh
    lỗi "giá trị không chia hết" khi step lớn chặn số lẻ).
  - Xoá đơn hoàn tồn kho tự động; `scripts/merge-orders.mjs` gộp nhiều đơn
    cùng khách thành một (giữ đơn đầu, dồn SP + tiền cọc, xoá đơn còn lại,
    không đụng tồn kho).
  - Tạo đơn thủ công (`/admin/orders/new`).
- `/admin/roles` — ma trận quyền (chỉ super_admin & manager).
- `/admin/settings`: bật/tắt hiển thị giá, chọn ngôn ngữ tên SP mặc định
  (VI/EN), cấu hình tài khoản VietQR, ngưỡng tặng mẫu thử, đơn giá ship Hàn
  tham khảo (₫/kg, chỉ để NV tra — không tự cộng).
- Còn lại (`inventory/`, `shipments/`, `promotions/`, `customers/`,
  `reports/`) phần lớn vẫn là stub hiển thị dữ liệu, chưa có action đầy đủ.

## Cấu trúc
- `src/app/(shop)/` — storefront (xem danh sách route ở trên).
- `src/app/admin/login/` — đăng nhập nhân viên (ngoài guard).
- `src/app/admin/(panel)/` — khu admin, sidebar tự ẩn mục thiếu quyền.
- Auth dùng chung nhân viên + khách (`role.key = "customer"`).
  `customerLoginAction`/`registerCustomerAction` trong `src/lib/auth-actions.ts`.
- `src/lib/` — `db.ts`, `auth.ts`(+`auth-actions.ts`), `actions.ts` (giỏ hàng +
  `placeOrderAction`), `admin-actions.ts` (giá/tồn/đơn/thanh toán/vận đơn),
  `settings.ts` (Setting key/value: bank info, showPrices, sampleThreshold,
  krShipPerKg, productNameLang, krwRate), `rbac.ts`, `i18n.ts` (VI/KO +
  `productName()`), `constants.ts` (cookie names, `PAY_METHODS`), `format.ts`,
  `cart.ts`.
- `src/proxy.ts` — chặn `/admin/*` khi chưa đăng nhập (Next 16 dùng `proxy`
  thay `middleware`).
- `prisma/schema.prisma` — `Order` có `orderType`/`depositRate`/
  `depositAmount`/`balanceAmount`/`shippingFee` (= phí ship Hàn);
  `Payment.kind` = DEPOSIT/BALANCE/FULL/REFUND, `Payment.provider` gồm
  `BANK_TRANSFER`; `Product.nameEn` (thêm sau, migration
  `20260903083825_product_name_en`); `PriceChangeRequest`+`PriceHistory` cho
  luồng đăng/duyệt giá.

## Quy ước
- Tiền tệ: **Int VND**. Dùng `formatVND()` / `effectivePrice()`.
- Phân quyền giá: `price.publish` tách khỏi `price.approve`.
- Mọi ô nhập số tiền trong admin/checkout dùng `<input type="number" step={1}>`
  — **không** đặt `step` lớn (10000/50000...), nó chặn giá trị không chia hết
  và làm form không submit được (đã từng gặp lỗi này ở OliuGUI).
- i18n storefront: VI/KO qua `i18n.ts`; tên sản phẩm thêm chiều VI/EN qua
  `productName()` + cấu hình admin — hai cơ chế **độc lập nhau**, đừng nhầm
  `pick(locale, ...)` (mô tả, meta) với `productName(locale, nameLang, ...)`
  (tên hiển thị).

## Chưa làm
Thanh toán VNPay/MoMo thật + vận chuyển GHN/GHTK thật (hiện mock), review UI
phía khách, form thêm/sửa sản phẩm đầy đủ (ảnh nhiều, thuộc tính), báo cáo
(Recharts), test (Vitest/Playwright), i18n next-intl/Tolgee, deploy production
(Vercel + Neon riêng cho Blooming), reset mật khẩu Neon nếu có lộ trong chat.
