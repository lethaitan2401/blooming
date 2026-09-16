import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLE_PRESETS } from "../src/lib/rbac";

const db = new PrismaClient();

const now = Date.now();
const day = 86_400_000;

async function main() {
  console.log("· Xoá dữ liệu cũ…");
  await db.$transaction([
    db.shipmentEvent.deleteMany(),
    db.shipment.deleteMany(),
    db.payment.deleteMany(),
    db.orderStatusEvent.deleteMany(),
    db.orderItem.deleteMany(),
    db.order.deleteMany(),
    db.cartItem.deleteMany(),
    db.cart.deleteMany(),
    db.priceChangeRequest.deleteMany(),
    db.priceHistory.deleteMany(),
    db.stockMovement.deleteMany(),
    db.review.deleteMany(),
    db.wishlist.deleteMany(),
    db.inventory.deleteMany(),
    db.productVariant.deleteMany(),
    db.productImage.deleteMany(),
    db.product.deleteMany(),
    db.category.deleteMany(),
    db.brand.deleteMany(),
    db.coupon.deleteMany(),
    db.address.deleteMany(),
    db.user.deleteMany(),
    db.role.deleteMany(),
    db.setting.deleteMany(),
  ]);

  console.log("· Vai trò & tài khoản…");
  const roles: Record<string, string> = {};
  for (const [key, preset] of Object.entries(ROLE_PRESETS)) {
    const r = await db.role.create({
      data: { key, name: preset.name, permissions: preset.permissions },
    });
    roles[key] = r.id;
  }

  const pw = bcrypt.hashSync("blooming12345", 10);
  const staff = await Promise.all([
    db.user.create({
      data: { email: "admin@blooming.vn", name: "Tan Le", passwordHash: pw, roleId: roles.super_admin, lastLoginAt: new Date() },
    }),
    db.user.create({
      data: { email: "tan.lethaitan@gmail.com", name: "Tan Le", passwordHash: pw, roleId: roles.super_admin },
    }),
    db.user.create({
      data: { email: "manager@blooming.vn", name: "Phạm Gia Hân", passwordHash: pw, roleId: roles.manager },
    }),
    db.user.create({
      data: { email: "sanpham@blooming.vn", name: "Ngô Minh", passwordHash: pw, roleId: roles.staff_product },
    }),
    db.user.create({
      data: { email: "donhang@blooming.vn", name: "Vũ Đức", passwordHash: pw, roleId: roles.staff_order },
    }),
    db.user.create({
      data: { email: "ketoan@blooming.vn", name: "Lý Trang", passwordHash: pw, roleId: roles.accountant, isActive: false },
    }),
  ]);

  await db.user.createMany({
    data: [
      { email: "trang@example.com", name: "Nguyễn Minh Trang", passwordHash: pw, roleId: roles.customer },
      { email: "hoanganh@example.com", name: "Trần Hoàng Anh", passwordHash: pw, roleId: roles.customer },
    ],
  });

  console.log("· Thương hiệu…");
  const brandData = [
    ["cosrx", "COSRX", true],
    ["anua", "Anua", true],
    ["beauty-of-joseon", "Beauty of Joseon", true],
    ["torriden", "Torriden", true],
    ["laneige", "Laneige", true],
    ["innisfree", "Innisfree", true],
    ["some-by-mi", "Some By Mi", false],
    ["round-lab", "Round Lab", false],
    ["skin1004", "Skin1004", false],
    ["numbuzin", "Numbuzin", false],
    ["romand", "Romand", false],
    ["medicube", "Medicube", false],
  ] as const;
  const brands: Record<string, string> = {};
  for (const [slug, name, feat] of brandData) {
    const b = await db.brand.create({
      data: { slug, name, logoText: name, isFeatured: feat },
    });
    brands[slug] = b.id;
  }

  console.log("· Danh mục…");
  const skincare = await db.category.create({
    data: { slug: "skincare", name: "Skincare", nameKo: "스킨케어", order: 1 },
  });
  const cats: Record<string, string> = { skincare: skincare.id };
  for (const [slug, name, ko] of [
    ["toner", "Toner & Nước hoa hồng", "토너"],
    ["essence", "Essence", "에센스"],
    ["serum", "Serum & Ampoule", "세럼"],
    ["kem-duong", "Kem dưỡng", "크림"],
  ] as const) {
    const c = await db.category.create({
      data: { slug, name, nameKo: ko, parentId: skincare.id },
    });
    cats[slug] = c.id;
  }
  for (const [slug, name, ko, order] of [
    ["trang-diem", "Trang điểm", "메이크업", 2],
    ["son-moi", "Son môi", "립", 3],
    ["mat-na", "Mặt nạ", "마스크팩", 4],
    ["chong-nang", "Chống nắng", "선케어", 5],
    ["cham-soc-co-the", "Chăm sóc cơ thể", "바디케어", 6],
    ["nuoc-hoa", "Nước hoa", "향수", 7],
  ] as const) {
    const c = await db.category.create({
      data: { slug, name, nameKo: ko, order },
    });
    cats[slug] = c.id;
  }

  console.log("· Sản phẩm…");
  type P = {
    slug: string;
    name: string;
    nameKo?: string;
    brand: keyof typeof brands;
    cat: string;
    desc: string;
    ingredients?: string;
    howTo?: string;
    best?: boolean;
    isNew?: boolean;
    preorder?: boolean;
    rating: number;
    ratingCount: number;
    sold: number;
    tints: string[];
    variants: {
      sku: string;
      name: string;
      cost: number;
      price: number;
      sale?: number;
      stock: number;
    }[];
  };

  const products: P[] = [
    {
      slug: "some-by-mi-30-days-miracle-toner",
      name: "Some By Mi AHA-BHA-PHA 30 Days Miracle Toner 150ml",
      nameKo: "썸바이미 AHA-BHA-PHA 30일 미라클 토너 150ml",
      brand: "some-by-mi",
      cat: "toner",
      desc: "Toner tẩy tế bào chết hoá học với bộ ba AHA – BHA – PHA giúp làm sạch sâu lỗ chân lông, loại bỏ tế bào chết và bã nhờn dư thừa, cho làn da mịn màng và thông thoáng hơn chỉ sau 30 ngày.\n\nBổ sung chiết xuất trà xanh và niacinamide làm dịu và hỗ trợ làm mờ thâm mụn.",
      ingredients: "Water, Butylene Glycol, Dipropylene Glycol, Niacinamide, Melaleuca Alternifolia (Tea Tree) Leaf Water…",
      howTo: "Dùng sau bước làm sạch, thấm ra bông tẩy trang, lau nhẹ 2–3 lần/tuần khi mới bắt đầu.",
      best: true,
      rating: 4.8,
      ratingCount: 2134,
      sold: 12500,
      tints: ["#EFEBE3", "#E9ECE8", "#F0E7E7"],
      variants: [
        { sku: "SBM-TN-150", name: "150ml", cost: 185000, price: 420000, sale: 294000, stock: 84 },
        { sku: "SBM-TN-030", name: "30ml (mini)", cost: 52000, price: 89000, stock: 140 },
      ],
    },
    {
      slug: "cosrx-advanced-snail-96-mucin-essence",
      name: "COSRX Advanced Snail 96 Mucin Power Essence 100ml",
      brand: "cosrx",
      cat: "essence",
      desc: "Tinh chất dưỡng ẩm chứa 96% dịch nhầy ốc sên giúp phục hồi, làm dịu và cấp ẩm cho da, cải thiện độ đàn hồi và làm mờ vết thâm.",
      best: true,
      rating: 4.9,
      ratingCount: 5400,
      sold: 18800,
      tints: ["#E9ECE8", "#EEEBE2"],
      variants: [
        { sku: "CRX-ES-100", name: "100ml", cost: 165000, price: 329000, stock: 126 },
      ],
    },
    {
      slug: "beauty-of-joseon-relief-sun-spf50",
      name: "Beauty of Joseon Relief Sun Rice + Probiotics SPF50+ 50ml",
      brand: "beauty-of-joseon",
      cat: "chong-nang",
      desc: "Kem chống nắng hoá học kết cấu mỏng nhẹ như serum, thấm nhanh, không bết dính, không vệt trắng. Chứa chiết xuất gạo và lợi khuẩn giúp làm dịu và dưỡng da.",
      best: true,
      rating: 4.8,
      ratingCount: 3700,
      sold: 15600,
      tints: ["#F0E7E7", "#E7EAEE"],
      variants: [
        { sku: "BOJ-SUN-50", name: "50ml", cost: 98000, price: 249000, sale: 187000, stock: 312 },
        { sku: "BOJ-SUN-2PK", name: "Combo x2", cost: 190000, price: 470000, sale: 349000, stock: 45 },
      ],
    },
    {
      slug: "torriden-dive-in-hyaluronic-serum",
      name: "Torriden DIVE-IN Low Molecular Hyaluronic Acid Serum 50ml",
      brand: "torriden",
      cat: "serum",
      desc: "Serum cấp ẩm với 5 loại hyaluronic acid phân tử thấp thẩm thấu sâu, làm dịu da nhạy cảm, kết cấu gel trong suốt mát nhẹ.",
      best: true,
      rating: 4.7,
      ratingCount: 1900,
      sold: 8200,
      tints: ["#E7EAEE", "#E9ECE7"],
      variants: [
        { sku: "TRD-DI-50", name: "50ml", cost: 128000, price: 255000, stock: 96 },
      ],
    },
    {
      slug: "anua-heartleaf-77-soothing-toner",
      name: "Anua Heartleaf 77% Soothing Toner 250ml",
      nameKo: "아누아 어성초 77% 수딩 토너 250ml",
      brand: "anua",
      cat: "toner",
      desc: "Toner làm dịu chứa 77% chiết xuất diếp cá (heartleaf) giúp giảm mẩn đỏ, cân bằng da và cấp ẩm nhẹ nhàng. Phù hợp da nhạy cảm, da mụn.",
      best: true,
      isNew: true,
      rating: 4.9,
      ratingCount: 4200,
      sold: 14100,
      tints: ["#E8ECEA", "#ECEAE4"],
      variants: [
        { sku: "ANU-HL-250", name: "250ml", cost: 150000, price: 312000, stock: 203 },
      ],
    },
    {
      slug: "round-lab-1025-dokdo-toner",
      name: "Round Lab 1025 Dokdo Toner 200ml",
      brand: "round-lab",
      cat: "toner",
      desc: "Toner cấp ẩm với nước biển Dokdo và khoáng chất, kết cấu lỏng nhẹ, làm dịu và củng cố hàng rào bảo vệ da.",
      isNew: true,
      rating: 4.9,
      ratingCount: 2600,
      sold: 9800,
      tints: ["#EEEBE2"],
      variants: [
        { sku: "RDL-DK-200", name: "200ml", cost: 140000, price: 289000, stock: 150 },
      ],
    },
    {
      slug: "skin1004-madagascar-centella-ampoule",
      name: "Skin1004 Madagascar Centella Ampoule 100ml",
      brand: "skin1004",
      cat: "serum",
      desc: "Ampoule chứa 100% chiết xuất rau má Madagascar giúp làm dịu, phục hồi và giảm kích ứng cho da nhạy cảm.",
      isNew: true,
      rating: 4.8,
      ratingCount: 3100,
      sold: 10400,
      tints: ["#EAEAEE"],
      variants: [
        { sku: "SK4-CA-100", name: "100ml", cost: 175000, price: 345000, stock: 88 },
      ],
    },
    {
      slug: "numbuzin-no3-skin-softening-serum",
      name: "Numbuzin No.3 Skin Softening Serum 50ml",
      brand: "numbuzin",
      cat: "serum",
      desc: "Serum dưỡng sáng và làm mềm da với niacinamide và chiết xuất gạo lên men, cải thiện tông da không đều màu.",
      isNew: true,
      preorder: true,
      rating: 4.7,
      ratingCount: 1300,
      sold: 4200,
      tints: ["#ECEAE4"],
      variants: [
        { sku: "NBZ-S3-50", name: "50ml", cost: 210000, price: 398000, stock: 11 },
      ],
    },
    {
      slug: "romand-juicy-lasting-tint-27",
      name: "Romand Juicy Lasting Tint #27 Pink Ade",
      brand: "romand",
      cat: "son-moi",
      desc: "Son tint bóng nước lâu trôi, cấp ẩm, màu hồng đào tươi tắn, lên môi mọng nước tự nhiên.",
      isNew: true,
      rating: 4.8,
      ratingCount: 980,
      sold: 6100,
      tints: ["#F0E7E7"],
      variants: [
        { sku: "RMD-JLT-27", name: "#27 Pink Ade", cost: 92000, price: 179000, stock: 4 },
        { sku: "RMD-JLT-19", name: "#19 Almond Rose", cost: 92000, price: 179000, stock: 32 },
      ],
    },
    {
      slug: "laneige-water-bank-blue-hyaluronic-cream",
      name: "Laneige Water Bank Blue Hyaluronic Cream 50ml",
      brand: "laneige",
      cat: "kem-duong",
      desc: "Kem dưỡng ẩm với Blue Hyaluronic Acid và mảng xanh biển sâu, phục hồi hàng rào ẩm, kết cấu giàu ẩm cho da thường đến khô.",
      preorder: true,
      rating: 4.7,
      ratingCount: 1500,
      sold: 5300,
      tints: ["#E7EAEE"],
      variants: [
        { sku: "LNG-WB-50", name: "50ml (da thường/khô)", cost: 320000, price: 585000, stock: 0 },
      ],
    },
    {
      slug: "medicube-zero-pore-pad-2",
      name: "Medicube Zero Pore Pad 2.0 (70 miếng)",
      brand: "medicube",
      cat: "toner",
      desc: "Miếng lau tẩy tế bào chết 2 mặt với PHA/BHA giúp làm sạch lỗ chân lông, kiềm dầu và làm mịn da.",
      isNew: true,
      rating: 4.6,
      ratingCount: 870,
      sold: 3900,
      tints: ["#EEEBE2"],
      variants: [
        { sku: "MDC-ZP-70", name: "70 miếng", cost: 230000, price: 429000, stock: 9 },
      ],
    },
    {
      slug: "innisfree-green-tea-seed-hyaluronic-serum",
      name: "Innisfree Green Tea Seed Hyaluronic Serum 50ml",
      brand: "innisfree",
      cat: "serum",
      desc: "Serum cấp ẩm với hạt trà xanh Jeju và 5 loại hyaluronic acid, cấp nước tức thì cho làn da căng mọng.",
      rating: 4.7,
      ratingCount: 1800,
      sold: 7200,
      tints: ["#E9ECE7"],
      variants: [
        { sku: "INF-GT-50", name: "50ml", cost: 150000, price: 299000, sale: 239000, stock: 120 },
      ],
    },
    {
      slug: "cosrx-aha-bha-clarifying-toner",
      name: "COSRX AHA/BHA Clarifying Treatment Toner 150ml",
      brand: "cosrx",
      cat: "toner",
      desc: "Toner làm sạch với AHA và BHA nồng độ nhẹ, chiết xuất vỏ cây liễu trắng, giúp thông thoáng lỗ chân lông và làm đều màu da.",
      best: true,
      rating: 4.7,
      ratingCount: 2900,
      sold: 9100,
      tints: ["#E9ECE8"],
      variants: [
        { sku: "CRX-CT-150", name: "150ml", cost: 118000, price: 239000, stock: 175 },
      ],
    },
    {
      slug: "beauty-of-joseon-glow-rice-milk-toner",
      name: "Beauty of Joseon Glow Replenishing Rice Milk 150ml",
      brand: "beauty-of-joseon",
      cat: "toner",
      desc: "Toner sữa gạo dưỡng ẩm và làm sáng với 68% nước gạo lên men và niacinamide, kết cấu mỏng nhẹ như sữa.",
      rating: 4.8,
      ratingCount: 3700,
      sold: 11200,
      tints: ["#F0E7E7"],
      variants: [
        { sku: "BOJ-RM-150", name: "150ml", cost: 120000, price: 249000, sale: 187000, stock: 240 },
      ],
    },
    {
      slug: "torriden-dive-in-cleansing-foam",
      name: "Torriden DIVE-IN Low Molecular HA Cleansing Foam 150ml",
      brand: "torriden",
      cat: "kem-duong",
      desc: "Sữa rửa mặt tạo bọt dịu nhẹ, độ pH thấp, chứa hyaluronic acid giữ ẩm, làm sạch nhưng không gây khô căng.",
      rating: 4.6,
      ratingCount: 640,
      sold: 2400,
      tints: ["#E9ECE7"],
      variants: [
        { sku: "TRD-CF-150", name: "150ml", cost: 90000, price: 189000, stock: 130 },
      ],
    },
    {
      slug: "anua-peach-70-niacinamide-serum",
      name: "Anua Peach 70% Niacinamide Serum 30ml",
      brand: "anua",
      cat: "serum",
      desc: "Serum dưỡng sáng với 70% chiết xuất đào và 5% niacinamide, làm mờ thâm nám, đều màu da và cấp ẩm.",
      preorder: true,
      isNew: true,
      rating: 4.8,
      ratingCount: 2100,
      sold: 6800,
      tints: ["#F0E7E7"],
      variants: [
        { sku: "ANU-PN-30", name: "30ml", cost: 175000, price: 359000, stock: 18 },
      ],
    },
  ];

  const variantBySku: Record<string, string> = {};
  for (const p of products) {
    const created = await db.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        nameKo: p.nameKo ?? null,
        description: p.desc,
        ingredients: p.ingredients ?? null,
        howToUse: p.howTo ?? null,
        status: p.variants.every((v) => v.stock === 0) ? "ACTIVE" : "ACTIVE",
        orderType: p.preorder ? "PREORDER" : "INSTOCK",
        isBestSeller: !!p.best,
        isNew: !!p.isNew,
        ratingAvg: p.rating,
        ratingCount: p.ratingCount,
        soldCount: p.sold,
        brandId: brands[p.brand],
        categoryId: cats[p.cat],
        images: {
          create: p.tints.map((tint, i) => ({ tint, order: i })),
        },
        variants: {
          create: p.variants.map((v) => ({
            sku: v.sku,
            name: v.name,
            costPrice: v.cost,
            price: v.price,
            salePrice: v.sale ?? null,
            saleStartsAt: v.sale ? new Date(now - 3 * day) : null,
            saleEndsAt: v.sale ? new Date(now + 7 * day) : null,
            inventory: { create: { quantity: v.stock } },
          })),
        },
      },
      include: { variants: true },
    });
    for (const v of created.variants) variantBySku[v.sku] = v.id;
  }

  console.log("· Yêu cầu đổi giá chờ duyệt…");
  const nvSanPham = staff.find((u) => u.email === "sanpham@blooming.vn")!;
  await db.priceChangeRequest.create({
    data: {
      variantId: variantBySku["SBM-TN-150"],
      field: "SALE_PRICE",
      oldValue: 294000,
      newValue: 249000,
      status: "PENDING",
      requestedBy: nvSanPham.id, // NV Sản phẩm
    },
  });

  console.log("· Đánh giá…");
  const reviewFor = variantBySku["SBM-TN-150"]
    ? (await db.productVariant.findUnique({
        where: { sku: "SBM-TN-150" },
        select: { productId: true },
      }))!.productId
    : null;
  if (reviewFor) {
    await db.review.createMany({
      data: [
        { productId: reviewFor, authorName: "Minh Trang", rating: 5, skinType: "Da dầu", body: "Dùng được 3 tuần, da bớt sần và mụn ẩn giảm rõ. Kết cấu lỏng nhẹ, không xót. Sẽ mua lại.", hasPhoto: true, helpfulCount: 48 },
        { productId: reviewFor, authorName: "Hoàng Anh", rating: 4, skinType: "Da hỗn hợp", body: "Sản phẩm ổn trong tầm giá, giao hàng nhanh. Da hơi khô nhẹ lúc đầu nên cần dưỡng ẩm kỹ.", helpfulCount: 12 },
        { productId: reviewFor, authorName: "Thu Hà", rating: 5, skinType: "Da nhạy cảm", body: "Da mình nhạy cảm mà dùng không bị kích ứng, chỉ dùng 2 lần/tuần. Đóng gói cẩn thận.", hasPhoto: true, helpfulCount: 7 },
      ],
    });
  }

  console.log("· Mã giảm giá…");
  await db.coupon.createMany({
    data: [
      // Khách mới nhận mẫu thử (không giảm tiền); giữ mã cũ nhưng tắt.
      { code: "OLIU50", type: "FIXED", value: 50000, minSubtotal: 250000, active: false },
      { code: "FREESHIP", type: "FREESHIP", value: 0, minSubtotal: 0, active: false },
      { code: "GLOW10", type: "PERCENT", value: 10, minSubtotal: 300000, active: true },
    ],
  });

  console.log("· Đơn hàng mẫu…");
  const cust = await db.user.findUnique({ where: { email: "trang@example.com" } });

  // 1) Đơn đặt cọc — preorder, chờ xác nhận
  const v1 = variantBySku["SBM-TN-150"];
  const v2 = variantBySku["CRX-ES-100"];
  const v3 = variantBySku["ANU-PN-30"]; // preorder
  const o1sub = 294000 + 329000 + 359000 * 2;
  const o1total = o1sub - 50000 + 22000;
  const o1 = await db.order.create({
    data: {
      code: "BL25891",
      userId: cust?.id,
      customerName: "Nguyễn Minh Trang",
      customerPhone: "0901234567",
      customerEmail: "trang@example.com",
      province: "TP. Hồ Chí Minh",
      district: "Quận 1",
      ward: "P. Bến Nghé",
      addressLine: "12 Nguyễn Huệ, tầng 4",
      note: "Giao trong giờ hành chính",
      shippingCarrier: "GHN",
      shippingFee: 22000,
      subtotal: o1sub,
      discount: 50000,
      couponCode: "OLIU50",
      total: o1total,
      orderType: "PREORDER",
      depositRate: 50,
      depositAmount: Math.round(o1total / 2),
      balanceAmount: o1total - Math.round(o1total / 2),
      balanceDueAt: new Date(now + 21 * day),
      paymentStatus: "DEPOSIT_PAID",
      status: "PENDING",
      items: {
        create: [
          { variantId: v1, productName: "Some By Mi 30 Days Miracle Toner 150ml", variantName: "150ml", unitPrice: 294000, quantity: 1, tint: "#EFEBE3" },
          { variantId: v2, productName: "COSRX Snail 96 Mucin Essence 100ml", variantName: "100ml", unitPrice: 329000, quantity: 1, tint: "#E9ECE8" },
          { variantId: v3, productName: "Anua Peach 70% Niacinamide Serum 30ml", variantName: "30ml", unitPrice: 359000, quantity: 2, tint: "#F0E7E7" },
        ],
      },
      events: { create: { status: "PENDING", note: "Đơn được tạo" } },
      payments: {
        create: {
          kind: "DEPOSIT",
          provider: "VNPAY",
          amount: Math.round(o1total / 2),
          status: "PAID",
          txnRef: "14582901",
          paidAt: new Date(now - 2 * 3600_000),
        },
      },
    },
  });
  void o1;

  // 2) & 3) Đơn hoàn tất, thanh toán đủ (cho dashboard doanh thu)
  for (const [i, spec] of [
    { code: "BL25888", name: "Phạm Quốc Bảo", prov: "TP. Hồ Chí Minh", dist: "Quận 7", total: 1248000, sku: "BOJ-SUN-2PK", pname: "Beauty of Joseon Relief Sun Combo x2", vname: "Combo x2", price: 349000, qty: 2 },
    { code: "BL25885", name: "Bùi Anh Tú", prov: "Hải Phòng", dist: "Lê Chân", total: 455000, sku: "TRD-DI-50", pname: "Torriden DIVE-IN HA Serum 50ml", vname: "50ml", price: 255000, qty: 1 },
    { code: "BL25880", name: "Đỗ Gia Hân", prov: "Hà Nội", dist: "Cầu Giấy", total: 668000, sku: "ANU-HL-250", pname: "Anua Heartleaf 77% Toner 250ml", vname: "250ml", price: 312000, qty: 2 },
  ].entries()) {
    const ord = await db.order.create({
      data: {
        code: spec.code,
        customerName: spec.name,
        customerPhone: "09" + (10000000 + i * 111111),
        province: spec.prov,
        district: spec.dist,
        ward: "—",
        addressLine: "—",
        shippingCarrier: i % 2 ? "GHTK" : "GHN",
        shippingFee: 22000,
        subtotal: spec.total - 22000,
        total: spec.total,
        orderType: "INSTOCK",
        depositRate: 0,
        depositAmount: spec.total,
        balanceAmount: 0,
        paymentStatus: "PAID",
        status: "COMPLETED",
        items: {
          create: [
            { variantId: variantBySku[spec.sku], productName: spec.pname, variantName: spec.vname, unitPrice: spec.price, quantity: spec.qty, tint: "#EFEBE3" },
          ],
        },
        events: {
          create: [
            { status: "PENDING" },
            { status: "CONFIRMED" },
            { status: "COMPLETED" },
          ],
        },
        payments: {
          create: {
            kind: "FULL",
            provider: (["VNPAY", "MOMO", "ZALOPAY"] as const)[i % 3],
            amount: spec.total,
            status: "PAID",
            paidAt: new Date(now - (i + 1) * day),
          },
        },
      },
    });
    void ord;
  }

  // 4) Đơn đang giao
  await db.order.create({
    data: {
      code: "BL25889",
      customerName: "Lê Thu Hà",
      customerPhone: "0912000333",
      province: "Đà Nẵng",
      district: "Hải Châu",
      ward: "—",
      addressLine: "—",
      shippingCarrier: "GHN",
      shippingFee: 22000,
      subtotal: 312000,
      total: 334000,
      orderType: "INSTOCK",
      depositRate: 0,
      depositAmount: 334000,
      balanceAmount: 0,
      paymentStatus: "PAID",
      status: "DELIVERING",
      items: {
        create: [
          { variantId: variantBySku["ANU-HL-250"], productName: "Anua Heartleaf 77% Toner 250ml", variantName: "250ml", unitPrice: 312000, quantity: 1, tint: "#E8ECEA" },
        ],
      },
      events: {
        create: [{ status: "PENDING" }, { status: "CONFIRMED" }, { status: "PACKING" }, { status: "HANDED_TO_CARRIER" }, { status: "DELIVERING" }],
      },
      payments: {
        create: { kind: "FULL", provider: "MOMO", amount: 334000, status: "PAID", paidAt: new Date(now - 3 * day) },
      },
      shipment: {
        create: {
          carrier: "GHN",
          trackingCode: "GHN5829104417",
          status: "IN_TRANSIT",
          events: { create: [{ status: "CREATED", description: "Đã tạo vận đơn" }, { status: "IN_TRANSIT", description: "Đang vận chuyển" }] },
        },
      },
    },
  });

  await db.setting.createMany({
    data: [
      { key: "freeShipThreshold", value: 299000 },
      { key: "defaultDepositRate", value: 50 },
      { key: "carrierFees", value: { GHN: 22000, GHTK: 18000 } },
    ],
  });

  console.log("✓ Seed xong.");
  console.log("  Admin: admin@blooming.vn / blooming12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
