/** Chuyển tên tiếng Việt -> slug URL an toàn: "Kem Dưỡng Ẩm" -> "kem-duong-am" */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // bỏ dấu tổ hợp
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70)
    .replace(/^-|-$/g, "");
}

/** Mã ngắn ổn định từ một chuỗi (dùng ghép SKU) */
export function shortHash(input: string): string {
  return [...input]
    .reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
    .toString(36)
    .toUpperCase()
    .slice(0, 6)
    .padEnd(6, "0");
}

/** SKU tự sinh: "SKI-A1B2C3-1" */
export function makeSku(brandSlug: string, productSlug: string, index: number): string {
  const abbr = (brandSlug.replace(/[^a-z]/gi, "").slice(0, 3) || "SKU").toUpperCase();
  return `${abbr}-${shortHash(productSlug)}-${index + 1}`;
}
