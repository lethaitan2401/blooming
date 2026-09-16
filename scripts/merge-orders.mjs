// Gộp nhiều đơn của cùng một khách thành MỘT đơn.
//
//   node scripts/merge-orders.mjs OL25901 OL25904 OL25907          # xem trước
//   node scripts/merge-orders.mjs OL25901 OL25904 OL25907 --apply  # thực hiện
//   ... thêm --force để bỏ qua cảnh báo (khác SĐT/địa chỉ, đã có vận đơn)
//
// Đơn ĐẦU TIÊN là đơn được GIỮ LẠI. Các đơn còn lại: dồn sản phẩm + tiền đã
// thu (cọc) sang đơn giữ, rồi XOÁ. KHÔNG đụng tồn kho (số lượng hàng bán ra
// không đổi nên tồn giữ nguyên).

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const FORCE = args.includes("--force");
const codes = args.filter((a) => !a.startsWith("--"));

const LOCKED = new Set(["COMPLETED", "CANCELLED", "RETURNED", "REFUNDED"]);
const vnd = (n) => Number(n).toLocaleString("vi-VN") + "₫";

if (codes.length < 2) {
  console.error("Cần ít nhất 2 mã đơn. VD: node scripts/merge-orders.mjs OL25901 OL25904");
  process.exit(1);
}

const orders = [];
for (const code of codes) {
  const o = await db.order.findUnique({
    where: { code },
    include: { items: true, payments: true, shipment: true },
  });
  if (!o) {
    console.error("✗ Không tìm thấy đơn", code);
    process.exit(1);
  }
  orders.push(o);
}

const keep = orders[0];
const rest = orders.slice(1);

console.log(`\nĐơn GIỮ LẠI:  ${keep.code}  ·  ${keep.customerName}  ·  ${keep.customerPhone}`);
console.log(`Đơn gộp vào:  ${rest.map((o) => o.code).join(", ")}\n`);

// ---- cảnh báo ----
const warns = [];
for (const o of orders) {
  if (LOCKED.has(o.status)) warns.push(`${o.code} đã ở trạng thái ${o.status} — không nên gộp`);
  if (o.shipment) warns.push(`${o.code} ĐÃ CÓ vận đơn (${o.shipment.trackingCode ?? "—"})`);
}
const phones = new Set(orders.map((o) => o.customerPhone.replace(/\D/g, "")));
if (phones.size > 1) warns.push(`SĐT khác nhau: ${[...phones].join(" / ")}`);
const addrs = new Set(orders.map((o) => `${o.addressLine}|${o.ward}|${o.district}|${o.province}`.toLowerCase()));
if (addrs.size > 1) {
  warns.push("Địa chỉ giao khác nhau:");
  orders.forEach((o) => warns.push(`   ${o.code}: ${o.addressLine}, ${o.ward}, ${o.district}, ${o.province}`));
}
if (warns.length) {
  console.log("⚠ CẢNH BÁO:");
  warns.forEach((w) => console.log("  " + w));
  console.log(FORCE ? "  → bỏ qua vì có --force\n" : "  → thêm --force để vẫn gộp\n");
  if (!FORCE) process.exit(1);
}

// ---- gộp sản phẩm ----
// key theo variantId; SP ngoài danh sách (không variant) gộp theo tên
const merged = new Map();
for (const o of orders) {
  for (const it of o.items) {
    const key = it.variantId ?? `custom:${it.productName}|${it.variantName}`;
    const ex = merged.get(key);
    if (ex) {
      ex.quantity += it.quantity;
      ex.unitPrice = Math.min(ex.unitPrice, it.unitPrice); // lấy giá thấp nhất nếu lệch
    } else {
      merged.set(key, {
        variantId: it.variantId,
        productName: it.productName,
        variantName: it.variantName,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        tint: it.tint,
        imageUrl: it.imageUrl,
        keepItemId: o.code === keep.code ? it.id : null,
      });
    }
  }
}
const items = [...merged.values()];

const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
const shippingFee = orders.reduce((s, o) => s + o.shippingFee, 0);
const discount = orders.reduce((s, o) => s + o.discount, 0);
const total = subtotal - discount + shippingFee;
const depositAmount = orders.reduce((s, o) => s + o.depositAmount, 0);
const depositRate = total > 0 ? Math.round((depositAmount / total) * 100) : 0;
const balanceAmount = Math.max(0, total - depositAmount);
const paymentStatus =
  depositAmount >= total && total > 0 ? "PAID" : depositAmount > 0 ? "DEPOSIT_PAID" : "UNPAID";

console.log("SẢN PHẨM SAU GỘP:");
for (const i of items)
  console.log(`  ${i.quantity} × ${i.productName} ${i.variantName}`.trimEnd() + `  @ ${vnd(i.unitPrice)}`);
console.log("\nTIỀN:");
console.log(`  Tạm tính     ${vnd(subtotal)}`);
console.log(`  Phí ship     ${vnd(shippingFee)}   (cộng dồn từ ${orders.length} đơn)`);
if (discount) console.log(`  Giảm giá     -${vnd(discount)}`);
console.log(`  TỔNG         ${vnd(total)}`);
console.log(`  Đã thu (cọc) ${vnd(depositAmount)}  → trạng thái ${paymentStatus}`);
console.log(`  Còn phải thu ${vnd(balanceAmount)}`);
console.log(`\nSau đó XOÁ: ${rest.map((o) => o.code).join(", ")}  (payment được chuyển sang ${keep.code})`);

if (!APPLY) {
  console.log("\n[XEM TRƯỚC] Thêm --apply để thực hiện.");
  await db.$disconnect();
  process.exit(0);
}

// ---- thực hiện ----
await db.$transaction(async (tx) => {
  // 1. cập nhật / tạo item trên đơn giữ
  const keepItemIds = new Set(keep.items.map((it) => it.id));
  const usedKeepIds = new Set();
  for (const i of items) {
    if (i.keepItemId && keepItemIds.has(i.keepItemId)) {
      await tx.orderItem.update({
        where: { id: i.keepItemId },
        data: { quantity: i.quantity, unitPrice: i.unitPrice },
      });
      usedKeepIds.add(i.keepItemId);
    } else {
      await tx.orderItem.create({
        data: {
          orderId: keep.id,
          variantId: i.variantId,
          productName: i.productName,
          variantName: i.variantName,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          tint: i.tint ?? "#EFEBE3",
          imageUrl: i.imageUrl,
        },
      });
    }
  }
  // xoá item thừa của đơn giữ (nếu có key trùng đã gộp vào dòng khác)
  const orphan = keep.items.filter((it) => !usedKeepIds.has(it.id)).map((it) => it.id);
  if (orphan.length) await tx.orderItem.deleteMany({ where: { id: { in: orphan } } });

  // 2. chuyển payment sang đơn giữ
  for (const o of rest) {
    await tx.payment.updateMany({ where: { orderId: o.id }, data: { orderId: keep.id } });
  }

  // 3. cập nhật đơn giữ
  await tx.order.update({
    where: { id: keep.id },
    data: {
      subtotal,
      shippingFee,
      discount,
      total,
      depositAmount,
      depositRate,
      balanceAmount,
      paymentStatus,
    },
  });

  // 4. ghi nhật ký + xoá đơn thừa
  await tx.orderStatusEvent.create({
    data: {
      orderId: keep.id,
      status: keep.status,
      note: `Gộp đơn ${rest.map((o) => o.code).join(", ")} vào đơn này`,
    },
  });
  for (const o of rest) {
    await tx.order.delete({ where: { id: o.id } });
  }
});

console.log(`\n✓ Đã gộp ${rest.length} đơn vào ${keep.code}.`);
await db.$disconnect();
