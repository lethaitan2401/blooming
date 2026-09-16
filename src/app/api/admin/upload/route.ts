import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { getCurrentUser } from "@/lib/auth";
import { STAFF_ROLE_KEYS } from "@/lib/rbac";

export const maxDuration = 30;

// Nhận file thô tối đa 20MB (ảnh điện thoại HEIC/JPG lớn), rồi nén lại.
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Upload 1 ảnh (admin). Nhận MỌI định dạng ảnh sharp đọc được
 * (JPG, PNG, WebP, GIF, HEIC/HEIF từ iPhone, TIFF, AVIF…) — trừ SVG.
 * Luôn chuẩn hoá về JPEG (hoặc PNG nếu có nền trong suốt), xoay đúng theo
 * EXIF, thu nhỏ ≤ 2000px. Lưu Vercel Blob (prod) hoặc /public/uploads (local).
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !STAFF_ROLE_KEYS.includes(user.role.key)) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
  }
  // loại rõ ràng không phải ảnh (video/pdf/…). Cho qua khi type rỗng hoặc image/*.
  const type = file.type || "";
  if (type && !type.startsWith("image/") && type !== "application/octet-stream") {
    return NextResponse.json(
      { error: "File không phải ảnh." },
      { status: 400 },
    );
  }
  if (/svg/i.test(type)) {
    return NextResponse.json(
      { error: "Không nhận file SVG. Dùng JPG / PNG / ảnh chụp." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Ảnh tối đa 20MB" }, { status: 400 });
  }

  let out: Buffer;
  let ext: "jpg" | "png";
  let contentType: string;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const img = sharp(input, { failOn: "none" }).rotate();
    const meta = await img.metadata();
    const resized = img.resize(2000, 2000, {
      fit: "inside",
      withoutEnlargement: true,
    });
    if (meta.hasAlpha) {
      out = await resized.png({ compressionLevel: 9 }).toBuffer();
      ext = "png";
      contentType = "image/png";
    } else {
      out = await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      ext = "jpg";
      contentType = "image/jpeg";
    }
  } catch {
    return NextResponse.json(
      { error: "Không đọc được ảnh. Thử đổi sang JPG hoặc PNG." },
      { status: 400 },
    );
  }

  const name = `${randomUUID()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${name}`, out, { access: "public", contentType });
    return NextResponse.json({ url: blob.url });
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), out);
  return NextResponse.json({ url: `/uploads/${name}` });
}
