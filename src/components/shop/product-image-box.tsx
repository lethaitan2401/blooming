import Image from "next/image";
import { PlaceholderImage } from "./placeholder-image";

/**
 * Hiển thị ảnh sản phẩm: ảnh thật nếu có `url`, ngược lại placeholder tint.
 */
export function ProductImageBox({
  url,
  tint = "#EFEBE3",
  alt,
  className = "",
  sizes = "(max-width: 768px) 45vw, 240px",
  iconSize = 54,
  priority = false,
}: {
  url?: string | null;
  tint?: string;
  alt: string;
  className?: string;
  sizes?: string;
  iconSize?: number;
  priority?: boolean;
}) {
  if (url) {
    return (
      <div className={`relative overflow-hidden bg-white ${className}`}>
        <Image
          src={url}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <PlaceholderImage tint={tint} className={className} iconSize={iconSize} />
  );
}
