// Việt hoá tên sản phẩm: đưa LOẠI sản phẩm lên đầu (dịch sang tiếng Việt),
// giữ nguyên tên riêng (brand) + tên dòng SP tiếng Anh, dịch nhẹ vài thành
// phần phổ biến. Tên gốc tiếng Anh lưu vào Product.nameEn.
//
//   node scripts/vietnamize-names.mjs           # chỉ xử lý SP chưa có nameEn
//   node scripts/vietnamize-names.mjs --dry     # xem trước, không ghi
//   node scripts/vietnamize-names.mjs --force   # dịch lại TẤT CẢ từ nameEn
//   node scripts/vietnamize-names.mjs --sample 40   # in nhiều ví dụ hơn
//
// Kết quả chỉ ~gần đúng — sửa tay chỗ chưa ưng trong /admin/products.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const FORCE = args.includes("--force");
const SAMPLE = Number(args[args.indexOf("--sample") + 1]) || 20;

// Loại SP: khớp trong tên (ưu tiên trên xuống), dịch + đưa lên đầu.
const TYPES = [
  [/\bcleansing oil\b/i, "Dầu tẩy trang"],
  [/\bcleansing balm\b/i, "Sáp tẩy trang"],
  [/\bcleansing (foam|gel)\b/i, "Sữa rửa mặt"],
  [/\bcleansing (milk|cream|lotion)\b/i, "Sữa tẩy trang"],
  [/\bcleansing water\b|\bmicellar water\b/i, "Nước tẩy trang"],
  [/\bcleansing (stick|bar)\b/i, "Thanh rửa mặt"],
  [/\bmakeup remover\b/i, "Tẩy trang"],
  [/\b(face|facial) wash\b|\bcleanser\b|\bcleansing foam\b|\bfoam cleanser\b/i, "Sữa rửa mặt"],
  [/\bsun ?(screen|block|stick|cream|serum|milk|gel|essence|fluid|lotion)\b|\bspf ?\d/i, "Kem chống nắng"],
  [/\blip sleeping mask\b/i, "Mặt nạ ngủ môi"],
  [/\bsleeping (mask|pack)\b/i, "Mặt nạ ngủ"],
  [/\b(sheet mask|mask sheet)\b/i, "Mặt nạ giấy"],
  [/\bclay mask\b/i, "Mặt nạ đất sét"],
  [/\beye (patch|patches|mask)\b/i, "Mặt nạ mắt"],
  [/\beye cream\b/i, "Kem mắt"],
  [/\beye serum\b/i, "Serum mắt"],
  [/\bhydrogel mask\b|\bmask\b/i, "Mặt nạ"],
  [/\btoner pads?\b/i, "Toner Pad"],
  [/\btoner\b/i, "Toner"],
  [/\bessence\b/i, "Essence"],
  [/\bampoule\b/i, "Ampoule"],
  [/\bserum\b/i, "Serum"],
  [/\bemulsion\b/i, "Sữa dưỡng"],
  [/\beye\b.*\bstick\b/i, "Bút mắt"],
  [/\blip (balm|butter)\b/i, "Son dưỡng"],
  [/\blip (tint|stain)\b/i, "Son tint"],
  [/\blip (gloss|glow)\b/i, "Son bóng"],
  [/\blipstick\b/i, "Son"],
  [/\blip\b/i, "Son"],
  [/\bcushion\b/i, "Cushion"],
  [/\bfoundation\b/i, "Kem nền"],
  [/\bconcealer\b/i, "Kem che khuyết điểm"],
  [/\bprimer\b/i, "Kem lót"],
  [/\b(setting|finish|face) powder\b|\bpowder\b/i, "Phấn phủ"],
  [/\bblush(er)?\b/i, "Má hồng"],
  [/\bmascara\b/i, "Mascara"],
  [/\beyeliner\b/i, "Kẻ mắt"],
  [/\b(eye ?shadow|eye palette)\b/i, "Phấn mắt"],
  [/\bbrow\b/i, "Chì mày"],
  [/\bbody wash\b|\bshower gel\b/i, "Sữa tắm"],
  [/\bbody (lotion|cream|butter|milk)\b/i, "Dưỡng thể"],
  [/\bbody oil\b/i, "Dầu dưỡng thể"],
  [/\bhand cream\b/i, "Kem tay"],
  [/\bshampoo\b/i, "Dầu gội"],
  [/\bconditioner\b/i, "Dầu xả"],
  [/\bhair (serum|oil|essence|treatment|mask)\b/i, "Dưỡng tóc"],
  [/\bperfume\b|\beau de (parfum|toilette)\b/i, "Nước hoa"],
  [/\bmist\b/i, "Xịt khoáng"],
  [/\bpeeling\b|\bexfoliat/i, "Tẩy da chết"],
  [/\bscrub\b/i, "Tẩy tế bào chết"],
  [/\bcream\b/i, "Kem dưỡng"],
  [/\bgel\b/i, "Gel dưỡng"],
  [/\boil\b/i, "Dầu dưỡng"],
  [/\bbalm\b/i, "Balm"],
  [/\bstick\b/i, "Thanh lăn"],
  [/\bpad\b/i, "Cotton Pad"],
];

// Thành phần an toàn để dịch (khớp nguyên từ, giữ hoa/thường tự nhiên).
const INGREDIENTS = [
  [/(?<![-\p{L}])heartleaf(?![-\p{L}])|(?<![-\p{L}])houttuynia(?![-\p{L}])/giu, "Diếp Cá"],
  [/(?<![-\p{L}])centella( asiatica)?(?![-\p{L}])/giu, "Rau Má"],
  [/(?<![-\p{L}])cica(?![-\p{L}])/giu, "Rau Má"],
  [/(?<![-\p{L}])snail(?![-\p{L}])/giu, "Ốc Sên"],
  [/\bpropolis\b/gi, "Keo Ong"],
  [/\bginseng\b/gi, "Nhân Sâm"],
  [/\bmugwort\b|\bartemisia\b/gi, "Ngải Cứu"],
  [/\bgreen tea\b/gi, "Trà Xanh"],
  [/\btea tree\b/gi, "Tràm Trà"],
  [/\bblack rice\b/gi, "Gạo Đen"],
  [/\bbrown rice\b/gi, "Gạo Lứt"],
  [/(?<![-\p{L}])rice(?![-\p{L}])/giu, "Gạo"],
  [/\bhoney\b/gi, "Mật Ong"],
  [/\baloe( vera)?\b/gi, "Nha Đam"],
  [/\bbamboo\b/gi, "Tre"],
  [/\bbirch\b/gi, "Bạch Dương"],
  [/\bartichoke\b/gi, "Atiso"],
  [/\bred bean\b/gi, "Đậu Đỏ"],
  [/\bmung bean\b/gi, "Đậu Xanh"],
  [/\bpomegranate\b/gi, "Lựu"],
  [/\bblueberry\b/gi, "Việt Quất"],
  [/\bwatermelon\b/gi, "Dưa Hấu"],
];

const CAT_VI = {
  skincare: "Skincare",
  "trang-diem": "Trang điểm",
  "son-moi": "Son",
  "mat-na": "Mặt nạ",
  "chong-nang": "Kem chống nắng",
  "cham-soc-co-the": "Chăm sóc cơ thể",
  "nuoc-hoa": "Nước hoa",
  toner: "Toner",
  essence: "Essence",
  serum: "Serum",
  "kem-duong": "Kem dưỡng",
};

function detectType(en) {
  for (const [re, vi] of TYPES) if (re.test(en)) return vi;
  return null;
}

function vietnamize(en, brand, catSlug, catName) {
  let s = en.trim().replace(/\s{2,}/g, " ");
  const type = detectType(s) ?? CAT_VI[catSlug] ?? catName ?? "Sản phẩm";

  // tách brand ở đầu (dùng brand chuẩn hoá, bỏ brand lặp lại)
  let brandPart = "";
  if (brand && s.toLowerCase().startsWith(brand.toLowerCase())) {
    brandPart = brand;
    s = s.slice(brand.length).replace(/^[\s:–-]+/, "");
    // vài tên lặp brand 2 lần ("d'Alba d'Alba …")
    if (s.toLowerCase().startsWith(brand.toLowerCase()))
      s = s.slice(brand.length).replace(/^[\s:–-]+/, "");
  }

  // dịch nhẹ thành phần + gộp "X (X)" trùng (kể cả nhiều chữ)
  for (const [re, vi] of INGREDIENTS) s = s.replace(re, vi);
  s = s.replace(/([\p{L}]+(?:\s+[\p{L}]+)*)\s*\(\s*\1\s*\)/giu, "$1");

  // bỏ các từ loại / định dạng tiếng Anh (đã có loại VN ở đầu)
  s = s
    .replace(
      /\b(toner pads?|toner|pads?|serum|ampoule|essence|cream|gel|lotion|emulsion|hydrogel|mask sheet|mask|sheet|pack|mist|cleanser|cleansing|foam|cushion|sunscreen|sunblock|sunstick|balm|oil|moisturi[sz]er|treatment|eye ?shadow|palette|powder|primer|concealer|foundation|shampoo|conditioner|peeling|scrub|wash|lipstick|refill|milk)\b/gi,
      " ",
    )
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([%)])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .trim()
    .replace(/\s+\b(and|with|&|for)\s*$/i, "")
    .replace(/^[\s:–\-&]+|[\s:–\-&]+$/g, "")
    .trim();

  const rest = [brandPart, s].filter(Boolean).join(" ").trim();
  return rest ? `${type} ${rest}` : type;
}

const rows = await db.product.findMany({
  include: {
    brand: { select: { name: true } },
    category: { select: { slug: true, name: true } },
  },
  orderBy: { soldCount: "desc" },
});

let changed = 0;
let skipped = 0;
const samples = [];
for (const p of rows) {
  if (p.nameEn && !FORCE) {
    skipped++;
    continue;
  }
  const en = p.nameEn ?? p.name;
  const vi = vietnamize(en, p.brand.name, p.category.slug, p.category.name);
  if (samples.length < SAMPLE) samples.push([en, vi]);
  if (!DRY) {
    await db.product.update({
      where: { id: p.id },
      data: { nameEn: en, name: vi },
    });
  }
  changed++;
}

console.log("\nVí dụ (theo lượt bán):");
for (const [en, vi] of samples) console.log(`  ${en}\n  → ${vi}\n`);
console.log(
  `${DRY ? "[DRY] " : ""}${DRY ? "Sẽ đổi" : "Đã đổi"} ${changed} SP · bỏ qua ${skipped} (đã có nameEn).`,
);

await db.$disconnect();
