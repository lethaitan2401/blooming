import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { guardAdmin } from "@/lib/admin-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { effectivePrice } from "@/lib/format";
import { getKrShipPerKg } from "@/lib/settings";
import { OrderEditForm, type OrderDTO } from "@/components/admin/order-edit-form";

export const metadata = { title: "Sửa đơn hàng" };

const LOCKED = ["COMPLETED", "CANCELLED", "RETURNED", "REFUNDED"];

export default async function EditOrderPage(props: {
  params: Promise<{ id: string }>;
}) {
  await guardAdmin({ anyOf: [PERMISSIONS.ORDER_WRITE] });
  const { id } = await props.params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { id: "asc" } },
      shipment: { select: { id: true } },
      payments: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  if (!order) notFound();
  if (LOCKED.includes(order.status)) redirect(`/admin/orders?id=${id}`);

  const products = await db.product.findMany({
    where: { status: { not: "HIDDEN" } },
    orderBy: { name: "asc" },
    include: {
      brand: { select: { name: true } },
      images: { orderBy: { order: "asc" }, take: 1 },
      variants: { orderBy: { price: "asc" }, include: { inventory: true } },
    },
  });

  const dto: OrderDTO = {
    id: order.id,
    code: order.code,
    status: order.status,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    province: order.province,
    district: order.district,
    ward: order.ward,
    addressLine: order.addressLine,
    note: order.note,
    shippingCarrier: order.shippingCarrier === "GHTK" ? "GHTK" : "GHN",
    shippingFee: order.shippingFee,
    discount: order.discount,
    depositRate: order.depositRate,
    paymentStatus: order.paymentStatus as OrderDTO["paymentStatus"],
    paymentProvider: order.payments[0]?.provider ?? null,
    hasShipment: !!order.shipment,
    items: order.items.map((it) => ({
      id: it.id,
      variantId: it.variantId,
      productName: it.productName,
      variantName: it.variantName,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      image: it.imageUrl,
      tint: it.tint,
    })),
  };

  const list = products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand.name,
    image: p.images[0]?.url ?? null,
    tint: p.images[0]?.tint ?? "#EFEBE3",
    variants: p.variants.map((v) => {
      const eff = effectivePrice(v);
      return {
        id: v.id,
        name: v.name,
        price: v.price,
        salePrice: eff.onSale ? eff.price : null,
        stock: v.inventory?.quantity ?? 0,
      };
    }),
  }));

  return (
    <div className="p-6 md:p-7">
      <div className="text-[12px] text-muted-2 mb-1">
        <Link href="/admin/orders">Đơn hàng</Link> /{" "}
        <Link href={`/admin/orders?id=${id}`}>#{order.code}</Link> /{" "}
        <span className="text-foreground">Sửa</span>
      </div>
      <h1 className="text-[22px] font-bold tracking-tight mb-1">
        Sửa đơn #{order.code}
      </h1>
      <p className="text-[13px] text-muted mb-5">
        Sửa người nhận, địa chỉ, sản phẩm, phí ship, giảm giá. Tổng tiền và tồn kho
        tự tính lại.
      </p>

      <OrderEditForm
        order={dto}
        products={list}
        krShipPerKg={await getKrShipPerKg()}
      />
    </div>
  );
}
