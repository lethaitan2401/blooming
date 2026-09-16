# Deploy Blooming lên Vercel (có link công khai)

Ba việc: **(1) đẩy code lên GitHub → (2) tạo Postgres cloud → (3) import vào Vercel**.

---

## 1. Đưa code lên GitHub

Repo local đã sẵn sàng (đã `git init` + commit đầu tiên). Chỉ cần tạo repo trống trên GitHub rồi push:

```bash
# Tạo repo trống tại https://github.com/new  (KHÔNG thêm README/gitignore)
# Tên gợi ý: blooming

git remote add origin https://github.com/<tài-khoản>/blooming.git
git branch -M main
git push -u origin main
```

> Repo ~230MB vì có sẵn ảnh 27+ brand trong `public/products/`. Push lần đầu hơi lâu.
> Sau này chuyển ảnh lên CDN thì bỏ comment `# /public/products/` trong `.gitignore`.

---

## 2. Tạo Postgres cloud (chọn 1)

### Cách A — Neon (khuyên dùng, miễn phí)
1. https://neon.tech → New Project → chọn region gần (Singapore).
2. Copy **connection string** (dạng `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`).

### Cách B — Vercel Postgres
Tạo ngay trong bước 3 (tab **Storage** của project Vercel) — Vercel tự set `DATABASE_URL`.

---

## 3. Import vào Vercel

1. https://vercel.com/new → chọn repo `blooming` vừa push.
2. Framework tự nhận **Next.js**. Build script `vercel-build` =
   `prisma generate && prisma migrate deploy && next build` — migration tự áp
   mỗi lần deploy. Nếu gặp lỗi khoá advisory (P1002) do Neon pooler, chạy tay:
   `DATABASE_URL='<chuỗi Neon>' npx prisma migrate deploy` rồi deploy lại.
3. **Environment Variables** — thêm:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | chuỗi kết nối Postgres ở bước 2 |
   | `AUTH_SECRET` | chạy `openssl rand -base64 32` rồi dán kết quả |
   | `NEXT_PUBLIC_SITE_NAME` | `blooming.` |
   | `NEXT_PUBLIC_DEFAULT_LOCALE` | `vi` |

4. Chạy migration + seed lên DB (mục 4 bên dưới) **trước hoặc sau** deploy đều được.

### 3b. Bật lưu ảnh upload (Vercel Blob)
Filesystem trên Vercel là read-only nên `/api/admin/upload` cần Blob:
1. Project → **Storage** → **Create** → **Blob**.
2. Vercel tự thêm biến `BLOB_READ_WRITE_TOKEN`. Redeploy.
   (Nếu bỏ qua bước này: mọi thứ vẫn chạy, chỉ nút "Tải ảnh lên" trong admin bị lỗi.)

---

## 4. Seed dữ liệu vào DB production (chạy 1 lần, từ máy local)

```bash
# Dùng chuỗi kết nối production
export DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"

npx prisma migrate deploy          # nếu chưa chạy ở bước build
npm run db:seed                    # roles, 5 acc nhân viên, coupon, đơn mẫu
node scripts/import-catalog.mjs --replace-demo   # SP thật + ảnh (ảnh path /products/...)
node scripts/vietnamize-names.mjs                # Việt hoá tên SP (lưu tên gốc vào nameEn)

unset DATABASE_URL
```

Tài khoản admin sau seed: **`admin@blooming.vn` / `blooming12345`** và
**`tan.lethaitan@gmail.com` / `blooming12345`** (Super Admin). Đăng nhập tại `/admin/login`.

---

## 5. Xong

- Storefront: `https://<project>.vercel.app`
- Admin: `https://<project>.vercel.app/admin/login`
- Mỗi lần `git push` lên `main` → Vercel tự build & deploy lại.

## Còn phải làm thật (hiện là mock)
- Cổng thanh toán VNPay/MoMo/ZaloPay, vận chuyển GHN/GHTK.
- Chuyển `public/products/` (210MB) + ảnh upload sang CDN/R2 để repo nhẹ.
