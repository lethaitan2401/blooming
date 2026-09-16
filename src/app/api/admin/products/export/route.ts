import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PERMISSIONS, can, STAFF_ROLE_KEYS } from "@/lib/rbac";
import { getKrwRate, krwToVnd } from "@/lib/settings";

export const maxDuration = 60;

const IMG_PX = 96; // kích thước thumbnail nhúng vào Excel

/** Tải + resize 1 ảnh về JPEG nhỏ. Trả null nếu lỗi. */
async function fetchThumb(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return await sharp(buf)
      .resize(IMG_PX, IMG_PX, { fit: "cover" })
      .jpeg({ quality: 72 })
      .toBuffer();
  } catch {
    return null;
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !STAFF_ROLE_KEYS.includes(user.role.key)) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }
  const perms = user.role.permissions;
  if (!can(perms, PERMISSIONS.PRODUCT_WRITE) && !can(perms, PERMISSIONS.PRICE_PUBLISH)) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }
  const canCost = can(perms, PERMISSIONS.COST_VIEW);

  const sp = new URL(req.url).searchParams;
  const category = sp.get("category") || undefined;
  const brand = sp.get("brand") || undefined;
  const q = sp.get("q") || undefined;
  const noImg = sp.get("noimg") === "1";

  const where: Prisma.ProductWhereInput = {
    ...(category
      ? { OR: [{ category: { slug: category } }, { category: { parent: { slug: category } } }] }
      : {}),
    ...(brand ? { brand: { slug: brand } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
            { brand: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [products, rate] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: [{ category: { order: "asc" } }, { brand: { name: "asc" } }, { name: "asc" }],
      include: {
        brand: true,
        category: true,
        images: { orderBy: { order: "asc" }, select: { url: true } },
        variants: { orderBy: { price: "asc" }, include: { inventory: true } },
      },
    }),
    getKrwRate(),
  ]);

  // ---- Tải ảnh (1 ảnh / sản phẩm, chọn ảnh đầu tiên có) ----
  const thumbs = new Map<string, Buffer>();
  if (!noImg) {
    const jobs = products
      .map((p) => {
        const raw = p.images.find((im) => im.url)?.url;
        if (!raw) return null;
        const abs = raw.startsWith("http") ? raw : new URL(raw, req.url).toString();
        return { id: p.id, abs };
      })
      .filter((x): x is { id: string; abs: string } => !!x);
    const results = await mapLimit(jobs, 12, (j) => fetchThumb(j.abs));
    jobs.forEach((j, idx) => {
      const b = results[idx];
      if (b) thumbs.set(j.id, b);
    });
  }

  // ---- Dựng workbook ----
  const wb = new ExcelJS.Workbook();
  wb.creator = "Blooming";
  wb.created = new Date();
  const ws = wb.addWorksheet("Sản phẩm");

  const headers: { header: string; key: string; width: number }[] = [
    { header: "Danh mục", key: "cat", width: 20 },
    { header: "Thương hiệu", key: "brand", width: 18 },
    { header: "Tên (VI)", key: "name", width: 44 },
    { header: "Tên (EN)", key: "nameEn", width: 44 },
    { header: "Biến thể", key: "variant", width: 16 },
    { header: "SKU", key: "sku", width: 16 },
    { header: "Ảnh", key: "img", width: 15 },
    { header: "Giá bán (₫)", key: "price", width: 15 },
    { header: "Giá KM (₫)", key: "sale", width: 15 },
  ];
  if (canCost) {
    headers.push(
      { header: "Giá nhập — Hàn (₩)", key: "krw", width: 18 },
      { header: "Giá nhập — Việt (₫)", key: "vnd", width: 18 },
      { header: "Giá vốn (₫)", key: "cost", width: 15 },
    );
  }
  headers.push({ header: "Tồn kho", key: "stock", width: 10 });
  // set widths/keys nhưng KHÔNG auto-ghi header (để chừa chỗ cho ô tỉ giá)
  ws.columns = headers.map((h) => ({ key: h.key, width: h.width }));

  const money = '#,##0" ₫"';
  const won = '#,##0" ₩"';
  const imgColNumber = 6; // cột "Ảnh"

  // ---- Ô TỈ GIÁ (chỉ khi xem được giá vốn) ----
  // Cột "Giá nhập — Việt" là công thức = [₩] × ô tỉ giá này.
  const RATE_CELL = "B1";
  const RATE_REF = "$B$1"; // tham chiếu tuyệt đối trong công thức
  const headerRowNum = canCost ? 3 : 1;
  if (canCost) {
    ws.getCell("A1").value = "TỈ GIÁ ₩ → ₫  →";
    ws.getCell("A1").font = { bold: true };
    ws.getCell("A1").alignment = { horizontal: "right", vertical: "middle" };
    const rc = ws.getCell(RATE_CELL);
    rc.value = rate;
    rc.numFmt = "0.###";
    rc.font = { bold: true, size: 13, color: { argb: "FF7A5B1E" } };
    rc.alignment = { horizontal: "center", vertical: "middle" };
    rc.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFDF3E0" },
    };
    rc.border = {
      top: { style: "medium", color: { argb: "FFB57A17" } },
      left: { style: "medium", color: { argb: "FFB57A17" } },
      bottom: { style: "medium", color: { argb: "FFB57A17" } },
      right: { style: "medium", color: { argb: "FFB57A17" } },
    };
    ws.getCell("C1").value = 'Sửa ô vàng bên trái, cột "Giá nhập — Việt (₫)" tự tính lại.';
    ws.getCell("C1").font = { italic: true, color: { argb: "FF9A9A9A" } };
    ws.getRow(1).height = 22;
  }

  // ---- Header ----
  const headerRow = ws.getRow(headerRowNum);
  headerRow.values = headers.map((h) => h.header);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", wrapText: true };
  headerRow.height = 30;
  ws.views = [{ state: "frozen", ySplit: headerRowNum }];

  const krwLetter = canCost ? ws.getColumn("krw").letter : "";

  for (const p of products) {
    const firstRowNumber = ws.rowCount + 1;
    for (const v of p.variants) {
      const krw = v.costKrw || 0;
      const row = ws.addRow({
        cat: p.category.name,
        brand: p.brand.name,
        name: p.name,
        nameEn: p.nameEn ?? "",
        variant: v.name,
        sku: v.sku,
        img: "",
        price: v.price,
        sale: v.salePrice ?? "",
        ...(canCost
          ? { krw: krw || "", cost: v.costPrice || "" }
          : {}),
        stock: v.inventory?.quantity ?? 0,
      });
      row.getCell("price").numFmt = money;
      row.getCell("sale").numFmt = money;
      if (canCost) {
        row.getCell("krw").numFmt = won;
        // Giá nhập — Việt = công thức: [₩ cùng dòng] × ô tỉ giá
        const vndCell = row.getCell("vnd");
        if (krw > 0) {
          vndCell.value = {
            formula: `${krwLetter}${row.number}*${RATE_REF}`,
            result: krwToVnd(krw, rate),
          };
        }
        vndCell.numFmt = money;
        row.getCell("cost").numFmt = money;
      }
      row.alignment = { vertical: "middle" };
    }
    // ảnh: đặt ở dòng đầu tiên của sản phẩm
    const thumb = thumbs.get(p.id);
    if (thumb) {
      const imgId = wb.addImage({
        buffer: thumb as unknown as ExcelJS.Buffer,
        extension: "jpeg",
      });
      ws.addImage(imgId, {
        tl: { col: imgColNumber - 1 + 0.1, row: firstRowNumber - 1 + 0.1 },
        ext: { width: IMG_PX, height: IMG_PX },
      });
      ws.getRow(firstRowNumber).height = 74;
    }
  }

  const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="blooming-san-pham-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
