/** Ảnh sản phẩm placeholder (chưa có ảnh thật) — hộp tint + icon chai lọ. */
export function PlaceholderImage({
  tint = "#EFEBE3",
  className = "",
  iconSize = 54,
}: {
  tint?: string;
  className?: string;
  iconSize?: number;
}) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ background: tint }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1D6FA5"
        strokeWidth="1"
        opacity="0.3"
      >
        <rect x="8" y="8.5" width="8" height="12.5" rx="1.5" />
        <path d="M10 8.5V5.5h4v3" />
        <path d="M10.5 4h3" />
      </svg>
    </div>
  );
}
