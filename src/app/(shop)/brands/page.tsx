import Link from "next/link";
import { db } from "@/lib/db";

export const metadata = { title: "Thương hiệu" };

export default async function BrandsPage() {
  const brands = await db.brand.findMany({
    where: { products: { some: { status: "ACTIVE" } } },
    orderBy: { products: { _count: "desc" } },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="mx-auto max-w-[1440px] px-4 md:px-16 py-8">
      <h1 className="text-[28px] font-bold tracking-tight mb-6">Thương hiệu</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {brands.map((b) => (
          <Link
            key={b.id}
            href={`/products?brand=${b.slug}`}
            className="border border-line rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-bloom transition-colors"
          >
            <span className="font-bold text-lg">{b.logoText ?? b.name}</span>
            <span className="text-[12px] text-muted-2">
              {b._count.products} sản phẩm
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
