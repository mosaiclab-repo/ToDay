const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// dateStr is YYYY-MM-DD; parse as local (not UTC) to avoid off-by-one shifts.
export function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

export function formatFullDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function isPastDue(dateCreated: string): boolean {
  return dateCreated !== todayLocal();
}

export const CATEGORY_LABEL: Record<string, string> = {
  client: 'Client Work',
  business_ops: 'Business Ops',
  personal: 'Personal',
};
