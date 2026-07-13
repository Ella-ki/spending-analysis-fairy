export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toMonthKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${year}.${month}`;
}

export function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function isWithinMonth(dateValue: string, month: Date) {
  const date = new Date(`${dateValue}T00:00:00`);
  return date >= startOfMonth(month) && date <= endOfMonth(month);
}
