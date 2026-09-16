"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getCurrentUser } from "./auth";
import { PERMISSIONS, can } from "./rbac";
import { getKrwRate, krwToVnd } from "./settings";
import { slugify, makeSku } from "./slug";

async function requireProductWriter() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Chưa đăng nhập");
  if (!can(user.role.permissions, PERMISSIONS.PRODUCT_WRITE)) {
    throw new Error("Không có quyền quản lý sản phẩm");
  }
  return user;
}

type VariantInput = {
  id?: string;
  name: string;
  sku?: string;
  costKrw?: number;
  price?: number;
  salePrice?: number | null;
  stock?: number;
};
type ImageInput = { url?: string; tint?: string };

function parseJSON<T>(raw: FormDataEntryValue | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(String(raw)) as T) : fallback;
  } catch {
    return fallback;
  }
}

const clampInt = (n: unknown, min = 0) => Math.max(min, Math.round(Number(n) || 0));
const HEX = /^#[0-9a-fA-F]{6}$/;

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || "san-pham";
  let slug = root;
  for (let i = 2; i < 60; i++) {
    const clash = await db.product.findUnique({ where: { slug } });
    if (!clash || clash.id === ignoreId) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

async function uniqueSku(candidate: string): Promise<string> {
  let sku = candidate.toUpperCase();
  for (let i = 0; i < 40; i++) {
    const clash = await db.productVariant.findUnique({ where: { sku } });
    if (!clash) return sku;
    sku = `${candidate.toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  }
  return `${candidate.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

/* ------------------------------------------------------------------ */
/* Tạo sản phẩm mới                                                     */
/* ------------------------------------------------------------------ */
export async function createProductAction(formData: FormData) {
  const user = await requireProductWriter();
  const canApprove = can(user.role.permissions, PERMISSIONS.PRICE_APPROVE);
  const canCost = can(user.role.permissions, PERMISSIONS.COST_VIEW);
  const rate = await getKrwRate();

  const g = (k: string) => String(formData.get(k) ?? "").trim();

  const name = g("name");
  if (!name) throw new Error("Thiếu tên sản phẩm");

  // thương hiệu: chọn sẵn hoặc tạo mới
  let brand = g("brandId")
    ? await db.brand.findUnique({ where: { id: g("brandId") } })
    : null;
  if (!brand && g("newBrandName")) {
    const bslug = await (async () => {
      const root = slugify(g("newBrandName")) || "thuong-hieu";
      let s = root;
      for (let i = 2; i < 40 && (await db.brand.findUnique({ where: { slug: s } })); i++)
        s = `${root}-${i}`;
      return s;
    })();
    brand = await db.brand.create({
      data: { slug: bslug, name: g("newBrandName"), isFeatured: true },
    });
  }
  if (!brand) throw new Error("Chọn hoặc nhập thương hiệu");

  const category = await db.category.findUnique({ where: { id: g("categoryId") } });
  if (!category) throw new Error("Chọn danh mục");

  const slug = await uniqueSlug(g("slug") || name);

  const rawVariants = parseJSON<VariantInput[]>(formData.get("variants"), []);
  const variants = rawVariants
    .map((v) => ({
      name: (v.name || "Tiêu chuẩn").trim(),
      sku: (v.sku || "").trim(),
      costKrw: canCost ? clampInt(v.costKrw) : 0,
      price: clampInt(v.price),
      salePrice:
        v.salePrice == null || v.salePrice === ("" as never)
          ? null
          : clampInt(v.salePrice),
      stock: clampInt(v.stock),
    }))
    .filter((v) => v.price > 0);
  if (variants.length === 0) throw new Error("Cần ít nhất 1 biến thể có giá bán > 0");

  const images = parseJSON<ImageInput[]>(formData.get("images"), [])
    .map((im) => ({
      url: (im.url || "").trim() || null,
      tint: im.tint && HEX.test(im.tint) ? im.tint : "#EFEBE3",
    }))
    .filter((im) => im.url)
    .slice(0, 8)
    .map((im, i) => ({ ...im, order: i }));

  const requested = g("status");
  const status =
    !canApprove && requested === "ACTIVE"
      ? "DRAFT"
      : (["ACTIVE", "DRAFT", "HIDDEN"].includes(requested) ? requested : "DRAFT");

  const product = await db.product.create({
    data: {
      slug,
      name,
      nameEn: g("nameEn") || null,
      nameKo: g("nameKo") || null,
      description: g("description") || null,
      ingredients: g("ingredients") || null,
      howToUse: g("howToUse") || null,
      origin: g("origin") || "Hàn Quốc",
      metaTitle: g("metaTitle") || null,
      metaDescription: g("metaDescription") || null,
      orderType: g("orderType") === "PREORDER" ? "PREORDER" : "INSTOCK",
      status: status as "ACTIVE" | "DRAFT" | "HIDDEN",
      isBestSeller: formData.get("isBestSeller") === "on",
      isNew: formData.get("isNew") === "on",
      brandId: brand.id,
      categoryId: category.id,
      images: images.length ? { create: images } : undefined,
      variants: {
        create: await Promise.all(
          variants.map(async (v, i) => ({
            sku: await uniqueSku(v.sku || makeSku(brand!.slug, slug, i)),
            name: v.name,
            costKrw: v.costKrw,
            costPrice: v.costKrw > 0 ? krwToVnd(v.costKrw, rate) : 0,
            price: v.price,
            salePrice: v.salePrice,
            inventory: { create: { quantity: v.stock } },
          })),
        ),
      },
    },
    include: { variants: true },
  });

  await db.priceHistory.createMany({
    data: product.variants.map((v) => ({
      variantId: v.id,
      field: "PRICE" as const,
      oldValue: null,
      newValue: v.price,
      changedBy: user.id,
      note: "Giá khởi tạo",
    })),
  });

  revalidatePath("/admin/products");
  revalidatePath("/products");
  redirect(`/admin/products/${product.id}/edit?created=1`);
}

/* ------------------------------------------------------------------ */
/* Cập nhật sản phẩm                                                    */
/* ------------------------------------------------------------------ */
export async function updateProductAction(formData: FormData) {
  const user = await requireProductWriter();
  const canApprove = can(user.role.permissions, PERMISSIONS.PRICE_APPROVE);
  const canCost = can(user.role.permissions, PERMISSIONS.COST_VIEW);
  const rate = await getKrwRate();

  const productId = String(formData.get("productId") ?? "");
  const existing = await db.product.findUnique({
    where: { id: productId },
    include: { variants: true, brand: true },
  });
  if (!existing) throw new Error("Không tìm thấy sản phẩm");

  const g = (k: string) => String(formData.get(k) ?? "").trim();

  const name = g("name") || existing.name;
  const slug =
    g("slug") && slugify(g("slug")) !== existing.slug
      ? await uniqueSlug(g("slug"), productId)
      : existing.slug;

  const brand = g("brandId")
    ? (await db.brand.findUnique({ where: { id: g("brandId") } })) ?? existing.brand
    : existing.brand;
  const category =
    (g("categoryId") && (await db.category.findUnique({ where: { id: g("categoryId") } }))) ||
    (await db.category.findUnique({ where: { id: existing.categoryId } }));

  const requested = g("status");
  const status =
    !canApprove && requested === "ACTIVE" && existing.status !== "ACTIVE"
      ? existing.status
      : ["ACTIVE", "DRAFT", "HIDDEN"].includes(requested)
        ? requested
        : existing.status;

  await db.product.update({
    where: { id: productId },
    data: {
      name,
      slug,
      nameEn: g("nameEn") || null,
      nameKo: g("nameKo") || null,
      description: g("description") || null,
      ingredients: g("ingredients") || null,
      howToUse: g("howToUse") || null,
      origin: g("origin") || "Hàn Quốc",
      metaTitle: g("metaTitle") || null,
      metaDescription: g("metaDescription") || null,
      orderType: g("orderType") === "PREORDER" ? "PREORDER" : "INSTOCK",
      status: status as "ACTIVE" | "DRAFT" | "HIDDEN",
      isBestSeller: formData.get("isBestSeller") === "on",
      isNew: formData.get("isNew") === "on",
      brandId: brand?.id ?? existing.brandId,
      categoryId: category?.id ?? existing.categoryId,
    },
  });

  // Ảnh: thay toàn bộ theo danh sách gửi lên
  const images = parseJSON<ImageInput[]>(formData.get("images"), [])
    .map((im) => ({
      productId,
      url: (im.url || "").trim() || null,
      tint: im.tint && HEX.test(im.tint) ? im.tint : "#EFEBE3",
    }))
    .filter((im) => im.url)
    .slice(0, 8)
    .map((im, i) => ({ ...im, order: i }));
  await db.productImage.deleteMany({ where: { productId } });
  if (images.length) await db.productImage.createMany({ data: images });

  // Biến thể
  const rawVariants = parseJSON<VariantInput[]>(formData.get("variants"), []);
  const byId = new Map(existing.variants.map((v) => [v.id, v]));
  let priceRequests = 0;

  for (let i = 0; i < rawVariants.length; i++) {
    const inp = rawVariants[i];
    const vname = (inp.name || "Tiêu chuẩn").trim();
    const price = clampInt(inp.price);
    const salePrice =
      inp.salePrice == null || inp.salePrice === ("" as never)
        ? null
        : clampInt(inp.salePrice);
    const stock = clampInt(inp.stock);
    const costKrw = clampInt(inp.costKrw);

    const cur = inp.id ? byId.get(inp.id) : undefined;

    if (cur) {
      // cập nhật thông tin không phải giá
      await db.productVariant.update({
        where: { id: cur.id },
        data: {
          name: vname,
          ...(canCost && costKrw !== cur.costKrw
            ? { costKrw, costPrice: costKrw > 0 ? krwToVnd(costKrw, rate) : 0 }
            : {}),
        },
      });

      // tồn kho
      const inv = await db.inventory.findUnique({ where: { variantId: cur.id } });
      if ((inv?.quantity ?? 0) !== stock) {
        const delta = stock - (inv?.quantity ?? 0);
        await db.inventory.upsert({
          where: { variantId: cur.id },
          create: { variantId: cur.id, quantity: stock },
          update: { quantity: stock },
        });
        await db.stockMovement.create({
          data: { variantId: cur.id, delta, reason: "adjust", note: "Sửa qua form sản phẩm" },
        });
      }

      // giá — áp ngay nếu có quyền duyệt, ngược lại tạo yêu cầu
      for (const [field, oldV, newV] of [
        ["PRICE", cur.price, price],
        ["SALE_PRICE", cur.salePrice, salePrice],
      ] as const) {
        if (oldV === newV) continue;
        if (field === "PRICE" && newV === 0) continue; // không cho xoá giá bán
        if (canApprove) {
          await db.productVariant.update({
            where: { id: cur.id },
            data: field === "PRICE" ? { price: newV as number } : { salePrice: newV },
          });
          await db.priceHistory.create({
            data: {
              variantId: cur.id,
              field,
              oldValue: oldV,
              newValue: newV,
              changedBy: user.id,
              note: "Sửa qua form sản phẩm",
            },
          });
        } else {
          await db.priceChangeRequest.create({
            data: {
              variantId: cur.id,
              field,
              oldValue: oldV,
              newValue: newV,
              requestedBy: user.id,
              status: "PENDING",
            },
          });
          priceRequests++;
        }
      }
    } else if (price > 0) {
      // biến thể mới
      const created = await db.productVariant.create({
        data: {
          productId,
          sku: await uniqueSku(inp.sku?.trim() || makeSku(brand?.slug ?? "sku", slug, i)),
          name: vname,
          costKrw: canCost ? costKrw : 0,
          costPrice: canCost && costKrw > 0 ? krwToVnd(costKrw, rate) : 0,
          price,
          salePrice,
          inventory: { create: { quantity: stock } },
        },
      });
      await db.priceHistory.create({
        data: {
          variantId: created.id,
          field: "PRICE",
          oldValue: null,
          newValue: price,
          changedBy: user.id,
          note: "Thêm biến thể",
        },
      });
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath(`/product/${slug}`);
  redirect(
    `/admin/products/${productId}/edit?saved=1${priceRequests ? `&pr=${priceRequests}` : ""}`,
  );
}
