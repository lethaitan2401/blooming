/** Danh sách quyền trong hệ thống */
export const PERMISSIONS = {
  PRODUCT_WRITE: "product.write",
  PRICE_PUBLISH: "price.publish",
  PRICE_APPROVE: "price.approve",
  COST_VIEW: "cost.view",
  ORDER_WRITE: "order.write",
  SHIPPING_WRITE: "shipping.write",
  INVENTORY_WRITE: "inventory.write",
  PROMO_WRITE: "promo.write",
  CUSTOMER_VIEW: "customer.view",
  REPORT_VIEW: "report.view",
  SETTINGS_WRITE: "settings.write",
  RBAC_WRITE: "rbac.write",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PRESETS: Record<
  string,
  { name: string; permissions: Permission[]; description: string }
> = {
  super_admin: {
    name: "Super Admin",
    description: "Toàn quyền hệ thống, gồm phân quyền & cấu hình.",
    permissions: Object.values(PERMISSIONS),
  },
  manager: {
    name: "Quản lý",
    description: "Sản phẩm, đăng & duyệt giá, khuyến mãi, đơn hàng, báo cáo.",
    permissions: [
      PERMISSIONS.PRODUCT_WRITE,
      PERMISSIONS.PRICE_PUBLISH,
      PERMISSIONS.PRICE_APPROVE,
      PERMISSIONS.COST_VIEW,
      PERMISSIONS.ORDER_WRITE,
      PERMISSIONS.SHIPPING_WRITE,
      PERMISSIONS.INVENTORY_WRITE,
      PERMISSIONS.PROMO_WRITE,
      PERMISSIONS.CUSTOMER_VIEW,
      PERMISSIONS.REPORT_VIEW,
    ],
  },
  staff_product: {
    name: "NV Sản phẩm",
    description: "Tạo/sửa sản phẩm & đăng giá (giá mới cần Quản lý duyệt).",
    permissions: [PERMISSIONS.PRODUCT_WRITE, PERMISSIONS.PRICE_PUBLISH],
  },
  staff_order: {
    name: "NV Đơn hàng",
    description: "Xử lý đơn, tạo vận đơn, đối soát thanh toán & COD.",
    permissions: [
      PERMISSIONS.ORDER_WRITE,
      PERMISSIONS.SHIPPING_WRITE,
      PERMISSIONS.CUSTOMER_VIEW,
    ],
  },
  staff_wh: {
    name: "NV Kho",
    description: "Nhập kho, điều chỉnh tồn, đóng gói. Không xem giá vốn.",
    permissions: [PERMISSIONS.INVENTORY_WRITE, PERMISSIONS.SHIPPING_WRITE],
  },
  accountant: {
    name: "Kế toán",
    description: "Chỉ xem báo cáo doanh thu, lợi nhuận, đối soát.",
    permissions: [PERMISSIONS.REPORT_VIEW, PERMISSIONS.COST_VIEW],
  },
  customer: {
    name: "Khách hàng",
    description: "Tài khoản mua hàng.",
    permissions: [],
  },
};

export function can(
  perms: string[] | undefined | null,
  permission: Permission,
): boolean {
  return !!perms?.includes(permission);
}

/** Các vai trò được vào khu admin */
export const STAFF_ROLE_KEYS = [
  "super_admin",
  "manager",
  "staff_product",
  "staff_order",
  "staff_wh",
  "accountant",
];

/** Điều kiện truy cập từng mục admin (dùng chung cho guard trang + ẩn menu). */
export type AccessRule = { anyOf?: Permission[]; roles?: string[] };

export const ADMIN_ACCESS: Record<string, AccessRule> = {
  "/admin": {}, // mọi nhân viên
  "/admin/orders": { anyOf: [PERMISSIONS.ORDER_WRITE, PERMISSIONS.SHIPPING_WRITE] },
  "/admin/products": { anyOf: [PERMISSIONS.PRODUCT_WRITE, PERMISSIONS.PRICE_PUBLISH] },
  "/admin/inventory": { anyOf: [PERMISSIONS.INVENTORY_WRITE] },
  "/admin/shipments": { anyOf: [PERMISSIONS.SHIPPING_WRITE] },
  "/admin/promotions": { anyOf: [PERMISSIONS.PROMO_WRITE] },
  "/admin/customers": { anyOf: [PERMISSIONS.CUSTOMER_VIEW] },
  "/admin/reports": { anyOf: [PERMISSIONS.REPORT_VIEW] },
  // Phân quyền: chỉ Quản lý & Super Admin
  "/admin/roles": { roles: ["super_admin", "manager"] },
  "/admin/settings": { anyOf: [PERMISSIONS.SETTINGS_WRITE] },
};
