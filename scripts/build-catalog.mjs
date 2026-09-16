/**
 * Lấy data + ảnh chính hãng từ store Shopify của brand → data/catalog.json
 * và tải ảnh về public/products/<slug>/.
 *
 * Chạy:  node scripts/build-catalog.mjs
 *   PRODUCTS (catalog-source) = SP hot có nhãn best/new
 *   BULK     = lấy thêm nhiều SP mỗi brand, tự phân loại
 */
import fs from "node:fs";
import path from "node:path";
import {
  PRODUCTS,
  BULK,
  RETAILERS,
  STORES,
  BRAND_NAMES,
  KNOWN_BRAND_SLUGS,
  toVND,
  costVND,
  costKRW,
  isJunk,
  categorize,
} from "./catalog-source.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const IMG_DIR = path.join(ROOT, "public", "products");
const OUT = path.join(ROOT, "data", "catalog.json");
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
const IMG_CURATED = 3;
const IMG_BULK = 2;

const stripHtml = (html) =>
  (html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);

async function fetchJSON(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function downloadImage(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000)
    return fs.statSync(dest).size;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`img ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

const storeCache = {};
async function getStoreProducts(domain) {
  if (!storeCache[domain]) {
    storeCache[domain] = await fetchJSON(
      `https://${domain}/products.json?limit=250`,
    ).then((d) => d.products);
  }
  return storeCache[domain];
}

/** Tạo 1 entry catalog từ product Shopify. */
async function buildEntry(
  p,
  { brandSlug, cat, flags = {}, domain, maxImages, nameOverride },
) {
  const variants = p.variants
    .filter((v) => Number(v.price) > 0)
    .map((v) => ({ title: v.title, usd: Number(v.price) }));
  if (variants.length === 0) return null;
  variants.sort((a, b) => a.usd - b.usd);

  let titleSlug = slugify(p.title);
  const prefix = brandSlug.split("-")[0];
  if (!titleSlug.startsWith(prefix)) titleSlug = `${brandSlug}-${titleSlug}`;
  const slug = titleSlug.replace(/-+/g, "-").slice(0, 55).replace(/-$/, "");

  const dir = path.join(IMG_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  const imgs = [];
  for (const [i, im] of (p.images || []).slice(0, maxImages).entries()) {
    const src = im.src.split("?")[0] + "?width=900";
    const ext = (src.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || "jpg").toLowerCase();
    const file = `${i + 1}.${ext}`;
    try {
      await downloadImage(src, path.join(dir, file));
      imgs.push(`/products/${slug}/${file}`);
    } catch (e) {
      console.warn(`  ✗ ảnh ${src}: ${e.message}`);
    }
  }
  if (imgs.length === 0) return null;

  const abbr = brandSlug.replace(/[^a-z]/g, "").slice(0, 3).toUpperCase();
  // hash slug -> mã ngắn duy nhất (tránh trùng SKU khi tên kết thúc giống nhau)
  const hash = [...slug]
    .reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
    .toString(36)
    .toUpperCase()
    .slice(0, 6);
  return {
    slug,
    name: (nameOverride ?? `${BRAND_NAMES[brandSlug]} ${p.title}`)
      .replace(/\s+/g, " ")
      .trim(),
    brandSlug,
    brandName: BRAND_NAMES[brandSlug],
    categorySlug: cat,
    description: stripHtml(p.body_html).slice(0, 600),
    origin: "Hàn Quốc",
    orderType: flags.preorder ? "PREORDER" : "INSTOCK",
    isBestSeller: !!flags.best,
    isNew: !!flags.isNew,
    rank: flags.rank ?? null,
    source: `https://${domain}/products/${p.handle}`,
    images: imgs,
    variants: variants.map((v, i) => {
      const price = toVND(v.usd);
      const onSale = flags.best && i === 0;
      const ml = v.title.match(/(\d+(?:\.\d+)?)\s*mL/i);
      const vname =
        v.title === "Default Title" ? "Tiêu chuẩn" : ml ? `${ml[1]}ml` : v.title;
      return {
        name: vname,
        sku: `${abbr}-${hash}-${i + 1}`,
        costKrw: costKRW(v.usd),
        costPrice: costVND(v.usd),
        price: onSale ? Math.round((price * 1.2) / 1000) * 1000 : price,
        salePrice: onSale ? price : null,
        stock: flags.preorder ? 8 + i * 2 : 35 + i * 20,
      };
    }),
  };
}

async function main() {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  const catalog = [];
  const seenSlugs = new Set();
  const seenHandles = new Set(); // `${brand}/${handle}`

  // ---- 1. Curated (có nhãn) ----
  for (const item of PRODUCTS) {
    const domain = STORES[item.brand];
    try {
      const products = await getStoreProducts(domain);
      const p = products.find((x) => x.handle === item.handle);
      if (!p) {
        console.warn(`✗ curated không thấy ${item.brand}/${item.handle}`);
        continue;
      }
      const entry = await buildEntry(p, {
        brandSlug: item.brand,
        cat: item.cat,
        flags: item,
        domain,
        maxImages: IMG_CURATED,
      });
      if (!entry) continue;
      catalog.push(entry);
      seenSlugs.add(entry.slug);
      seenHandles.add(`${item.brand}/${p.handle}`);
      console.log(`★ ${entry.slug}`);
    } catch (e) {
      console.warn(`✗ ${item.brand}/${item.handle}: ${e.message}`);
    }
  }

  const MAKEUP_BRANDS = new Set(["dasique", "fwee", "tonymoly"]);

  // ---- 2. Bulk (tự phân loại) ----
  for (const { brand, max } of BULK) {
    const domain = STORES[brand];
    if (!domain) continue;
    const isMk = MAKEUP_BRANDS.has(brand);
    let added = 0;
    try {
      const products = await getStoreProducts(domain);
      for (const p of products) {
        if (added >= max) break;
        if (seenHandles.has(`${brand}/${p.handle}`)) continue;
        const minUsd = Math.min(
          ...p.variants.map((v) => Number(v.price)).filter((n) => n > 0),
          Infinity,
        );
        if (isJunk(p.title, minUsd, isMk)) continue;
        const cat = categorize(p.title, isMk);
        if (!cat) continue;
        const entry = await buildEntry(p, {
          brandSlug: brand,
          cat,
          flags: {},
          domain,
          maxImages: IMG_BULK,
        });
        if (!entry || seenSlugs.has(entry.slug)) continue;
        catalog.push(entry);
        seenSlugs.add(entry.slug);
        seenHandles.add(`${brand}/${p.handle}`);
        added++;
        console.log(`  + ${entry.slug}  [${cat}]`);
      }
    } catch (e) {
      console.warn(`✗ bulk ${brand}: ${e.message}`);
    }
    console.log(`— ${brand}: +${added} SP`);
  }

  // ---- 3. Retailer ----
  for (const r of RETAILERS) {
    let added = 0;
    try {
      const { products } = await fetchJSON(r.url);
      const host = new URL(r.url).host;
      for (const p of products) {
        if (r.max && added >= r.max) break;
        if (/\bset\b|\[set\]|bundle|\bkit\b/i.test(p.title)) continue;

        let brandSlug, cat, name, flags;
        if (r.useVendor) {
          // brand từ vendor
          const key = (p.vendor || "").trim().toLowerCase();
          brandSlug = KNOWN_BRAND_SLUGS[key];
          if (!brandSlug || !BRAND_NAMES[brandSlug]) continue;
          const minUsd = Math.min(
            ...p.variants.map((v) => Number(v.price)).filter((n) => n > 0),
            Infinity,
          );
          if (isJunk(p.title, minUsd, true)) continue;
          cat = categorize(p.title, true);
          if (cat !== "son-moi" && cat !== "trang-diem") continue; // chỉ lấy makeup
          flags = {};
          if (!r.isUsd)
            for (const v of p.variants)
              v.price = String((Number(v.price) * r.rateToVnd) / 15500);
        } else {
          const rule = r.map.find((m) => m.match.test(p.title));
          if (!rule) continue;
          brandSlug = r.brand;
          cat = rule.cat;
          name = rule.name;
          flags = { best: rule.best, isNew: rule.isNew, rank: rule.rank };
          for (const v of p.variants)
            v.price = String((Number(v.price) * r.rateToVnd) / 15500);
        }

        const entry = await buildEntry(p, {
          brandSlug,
          cat,
          flags: flags ?? {},
          domain: host,
          maxImages: IMG_BULK,
          nameOverride: name,
        });
        if (!entry || seenSlugs.has(entry.slug)) continue;
        catalog.push(entry);
        seenSlugs.add(entry.slug);
        added++;
        console.log(`  ⊕ ${entry.slug}  [${cat}] (${BRAND_NAMES[brandSlug]})`);
      }
    } catch (e) {
      console.warn(`✗ retailer ${r.brand ?? r.url}: ${e.message}`);
    }
    console.log(`— ${r.brand ?? "makeup retailer"}: +${added} SP`);
  }

  fs.writeFileSync(OUT, JSON.stringify(catalog, null, 2));

  // dọn thư mục ảnh mồ côi (SP đã bị loại khỏi catalog)
  const keep = new Set(catalog.map((c) => c.slug));
  let removed = 0;
  for (const d of fs.readdirSync(IMG_DIR)) {
    if (!keep.has(d)) {
      fs.rmSync(path.join(IMG_DIR, d), { recursive: true, force: true });
      removed++;
    }
  }

  console.log(
    `\n→ ${catalog.length} sản phẩm ghi vào ${path.relative(ROOT, OUT)}` +
      (removed ? ` (dọn ${removed} thư mục ảnh mồ côi)` : ""),
  );
}

main();
