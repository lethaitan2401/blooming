/**
 * Import data/catalog.json vào DB (upsert theo slug).
 * Chạy:  node scripts/import-catalog.mjs
 *        node scripts/import-catalog.mjs --replace-demo   (xoá sản phẩm seed cũ trước)
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const ROOT = path.resolve(import.meta.dirname, "..");
const catalog = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "catalog.json"), "utf8"),
);

const CAT_NAMES = {
  toner: "Toner & Nước hoa hồng",
  essence: "Essence",
  serum: "Serum & Ampoule",
  "kem-duong": "Kem dưỡng",
  "chong-nang": "Chống nắng",
  "lam-sach": "Làm sạch",
  "mat-na": "Mặt nạ",
  "trang-diem": "Trang điểm",
  "son-moi": "Son môi",
  "thuc-pham-chuc-nang": "Thực phẩm chức năng",
};

const CAT_NAMES_KO = {
  toner: "토너",
  essence: "에센스",
  serum: "세럼",
  "kem-duong": "크림",
  "chong-nang": "선케어",
  "lam-sach": "클렌징",
  "mat-na": "마스크팩",
  "trang-diem": "메이크업",
  "son-moi": "립",
  "thuc-pham-chuc-nang": "건강기능식품",
};

// tint suy ra từ danh mục (fallback khi ảnh lỗi)
const CAT_TINT = {
  toner: "#EEEBE2",
  essence: "#E9ECE8",
  serum: "#E7EAEE",
  "kem-duong": "#F0E7E7",
  "chong-nang": "#F1EDE6",
  "lam-sach": "#E8ECEA",
  "mat-na": "#ECEAF0",
  "trang-diem": "#F0E7EC",
  "son-moi": "#F0E3E3",
  "thuc-pham-chuc-nang": "#EAF1E6",
};

// danh mục top-level (không thuộc nhánh Skincare)
const TOP_LEVEL = new Set(["trang-diem", "son-moi", "mat-na", "nuoc-hoa", "thuc-pham-chuc-nang"]);

async function ensureCategory(slug) {
  const existing = await db.category.findUnique({ where: { slug } });
  if (existing) return existing;
  const parentId = TOP_LEVEL.has(slug)
    ? null
    : (await db.category.findUnique({ where: { slug: "skincare" } }))?.id ?? null;
  return db.category.create({
    data: { slug, name: CAT_NAMES[slug] ?? slug, nameKo: CAT_NAMES_KO[slug], parentId, order: 3 },
  });
}

async function ensureBrand(slug, name) {
  return db.brand.upsert({
    where: { slug },
    create: { slug, name, logoText: name, isFeatured: true },
    update: { name, isFeatured: true },
  });
}

async function main() {
  const replaceDemo = process.argv.includes("--replace-demo");
  if (replaceDemo) {
    console.log("· Xoá sản phẩm seed cũ (giữ đơn hàng)…");
    await db.orderItem.updateMany({ data: { variantId: null } });
    await db.priceChangeRequest.deleteMany();
    await db.priceHistory.deleteMany();
    await db.stockMovement.deleteMany();
    await db.cartItem.deleteMany();
    await db.review.deleteMany();
    await db.wishlist.deleteMany();
    await db.inventory.deleteMany();
    await db.productVariant.deleteMany();
    await db.productImage.deleteMany();
    await db.product.deleteMany();
  }

  let ok = 0;
  for (const p of catalog) {
    const brand = await ensureBrand(p.brandSlug, p.brandName);
    const cat = await ensureCategory(p.categorySlug);
    const tint = CAT_TINT[p.categorySlug] ?? "#EFEBE3";

    const product = await db.product.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        name: p.name,
        ...(p.nameEn ? { nameEn: p.nameEn } : {}),
        ...(p.nameKo ? { nameKo: p.nameKo } : {}),
        description: p.description,
        origin: p.origin ?? "Hàn Quốc",
        status: "ACTIVE",
        orderType: p.orderType ?? "INSTOCK",
        isBestSeller: !!p.isBestSeller,
        isNew: !!p.isNew,
        ratingAvg: 4.6 + Math.random() * 0.35,
        ratingCount: 200 + Math.floor(Math.random() * 4000),
        soldCount: 500 + Math.floor(Math.random() * 15000),
        brandId: brand.id,
        categoryId: cat.id,
      },
      update: {
        name: p.name,
        ...(p.nameEn ? { nameEn: p.nameEn } : {}),
        ...(p.nameKo ? { nameKo: p.nameKo } : {}),
        description: p.description,
        orderType: p.orderType ?? "INSTOCK",
        isBestSeller: !!p.isBestSeller,
        isNew: !!p.isNew,
        brandId: brand.id,
        categoryId: cat.id,
      },
    });

    // ảnh
    await db.productImage.deleteMany({ where: { productId: product.id } });
    const imgs = p.images?.length ? p.images : [];
    if (imgs.length) {
      await db.productImage.createMany({
        data: imgs.map((url, i) => ({ productId: product.id, url, tint, order: i })),
      });
    } else {
      await db.productImage.create({
        data: { productId: product.id, tint, order: 0 },
      });
    }

    // biến thể + tồn
    for (const v of p.variants) {
      const variant = await db.productVariant.upsert({
        where: { sku: v.sku },
        create: {
          productId: product.id,
          sku: v.sku,
          name: v.name,
          costKrw: v.costKrw ?? 0,
          costPrice: v.costPrice,
          price: v.price,
          salePrice: v.salePrice ?? null,
          saleStartsAt: v.salePrice ? new Date(Date.now() - 3 * 864e5) : null,
          saleEndsAt: v.salePrice ? new Date(Date.now() + 10 * 864e5) : null,
        },
        update: {
          name: v.name,
          costKrw: v.costKrw ?? 0,
          costPrice: v.costPrice,
          price: v.price,
          salePrice: v.salePrice ?? null,
        },
      });
      await db.inventory.upsert({
        where: { variantId: variant.id },
        create: { variantId: variant.id, quantity: v.stock },
        update: { quantity: v.stock },
      });
    }
    ok++;
    console.log(`✓ ${p.slug}`);
  }

  // dọn thương hiệu không còn sản phẩm nào
  const emptyBrands = await db.brand.deleteMany({
    where: { products: { none: {} } },
  });
  if (emptyBrands.count)
    console.log(`· Xoá ${emptyBrands.count} thương hiệu rỗng.`);

  console.log(`\n→ Import ${ok}/${catalog.length} sản phẩm.`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
