import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { db } from "./db";
import { CART_COOKIE } from "./constants";


/** Đọc cart id từ cookie (không tạo mới — dùng ở nơi chỉ đọc như layout). */
export async function getCartSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

/** Tạo/đọc cart id — chỉ gọi trong Server Action / Route Handler (được set cookie). */
export async function ensureCartSessionId(): Promise<string> {
  const store = await cookies();
  let id = store.get(CART_COOKIE)?.value;
  if (!id) {
    id = randomUUID();
    store.set(CART_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 60,
    });
  }
  return id;
}

export async function getCart() {
  const sessionId = await getCartSessionId();
  if (!sessionId) return null;
  return db.cart.findUnique({
    where: { sessionId },
    include: {
      items: {
        include: {
          variant: { include: { product: { include: { images: true, brand: true } } } },
        },
      },
    },
  });
}

export async function getCartCount(): Promise<number> {
  const cart = await getCart();
  if (!cart) return 0;
  return cart.items.reduce((n, i) => n + i.quantity, 0);
}
