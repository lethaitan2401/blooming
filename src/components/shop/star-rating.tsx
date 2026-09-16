export function StarRating({
  value,
  count,
  size = 13,
}: {
  value: number;
  count?: number;
  size?: number;
}) {
  return (
    <span className="flex items-center gap-1 text-xs">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#1D6FA5">
        <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 21.4l1.4-6.8L2.2 9.9l6.9-.8z" />
      </svg>
      <b>{value.toFixed(1)}</b>
      {count != null && (
        <span className="text-muted-2">
          ({count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count})
        </span>
      )}
    </span>
  );
}
