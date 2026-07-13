export function formatKrw(value: number, compact = false) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
    notation: compact ? "compact" : "standard",
  }).format(Math.round(value));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

export function signedKrw(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatKrw(value)}`;
}
