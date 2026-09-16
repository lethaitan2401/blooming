import fs from "node:fs";
import path from "node:path";
import { BRANDS, ITEMS } from "./_supplement-data.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const IMG_DIR = path.join(ROOT, "public", "products");
const CATALOG_PATH = path.join(ROOT, "data", "catalog.json");
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" };
const KRW_RATE = 18; // đồng bộ src/lib/settings.ts / catalog-source.mjs
const MARKUP = 1.565; // đồng bộ tỉ lệ price/costPrice của các category khác

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/-$/, "");

function imageUrlFor(file) {
  const digits = (file.match(/\d+/) || [""])[0];
  const folder = digits.slice(4, 8) || "0000";
  return `https://image.oliveyoung.co.kr/cfimages/cf-goods/uploads/images/thumbnails/400/10/0000/${folder}/${file}`;
}

async function downloadImage(url, dest) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 500) throw new Error("too small, likely placeholder/error image");
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function main() {
  const seenSlug = new Set();
  const catalog = [];
  let ok = 0, failed = 0;

  for (const [brandKo, nameKo, nameVi, nameEn, priceKrw, file] of ITEMS) {
    const [brandSlug, brandName] = BRANDS[brandKo] ?? [slugify(brandKo), brandKo];
    let base = `${brandSlug}-${slugify(nameEn)}`.slice(0, 60).replace(/-$/, "");
    let slug = base;
    let n = 2;
    while (seenSlug.has(slug)) slug = `${base}-${n++}`;
    seenSlug.add(slug);

    const dir = path.join(IMG_DIR, slug);
    fs.mkdirSync(dir, { recursive: true });
    const ext = (file.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || "jpg").toLowerCase();
    const dest = path.join(dir, `1.${ext}`);
    const images = [];
    try {
      await downloadImage(imageUrlFor(file), dest);
      images.push(`/products/${slug}/1.${ext}`);
      ok++;
    } catch (e) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.warn(`✗ ảnh ${slug}: ${e.message}`);
      failed++;
    }

    const costKrw = priceKrw;
    const costPrice = Math.round((costKrw * KRW_RATE) / 1000) * 1000;
    const price = Math.round((costPrice * MARKUP) / 1000) * 1000;
    const abbr = brandSlug.replace(/[^a-z]/g, "").slice(0, 3).toUpperCase() || "TPC";
    const hash = [...slug]
      .reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
      .toString(36)
      .toUpperCase()
      .slice(0, 6);

    catalog.push({
      slug,
      name: nameVi,
      nameEn,
      nameKo,
      brandSlug,
      brandName,
      categorySlug: "thuc-pham-chuc-nang",
      description: nameKo,
      origin: "Hàn Quốc",
      orderType: "INSTOCK",
      isBestSeller: Math.random() < 0.25,
      isNew: Math.random() < 0.15,
      source: "oliveyoung.co.kr",
      images,
      variants: [
        {
          name: "Tiêu chuẩn",
          sku: `${abbr}-${hash}-1`,
          costKrw,
          costPrice,
          price,
          salePrice: null,
          stock: 20 + Math.floor(Math.random() * 60),
        },
      ],
    });
    console.log(`${images.length ? "✓" : "·"} ${slug}`);
  }

  const existing = fs.existsSync(CATALOG_PATH)
    ? JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"))
    : [];
  const existingSlugs = new Set(existing.map((p) => p.slug));
  const merged = existing.concat(catalog.filter((p) => !existingSlugs.has(p.slug)));
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(merged, null, 2));

  console.log(`\n→ ${catalog.length} sản phẩm TPCN (ảnh OK: ${ok}, lỗi: ${failed}).`);
  console.log(`→ catalog.json: ${existing.length} → ${merged.length} sản phẩm.`);
}

main();
