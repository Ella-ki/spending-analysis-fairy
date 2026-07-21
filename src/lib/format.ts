const krwFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 0,
});

export function formatKrw(value: number, _compact = false) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return krwFormatter.format(Math.round(safeValue));
}

export function formatNumber(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return numberFormatter.format(Math.round(safeValue));
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
