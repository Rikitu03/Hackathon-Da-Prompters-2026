export type CycleWindow = "undated" | "upcoming" | "open" | "closed";

export function manilaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function cycleWindow(start: string | null, end: string | null, now = new Date()): CycleWindow {
  if (!start && !end) return "undated";
  const today = manilaToday(now);
  if (end && today > end.slice(0, 10)) return "closed";
  if (start && today < start.slice(0, 10)) return "upcoming";
  return "open";
}

export function formatCycleDate(isoDate: string): string {
  const parts = new Intl.DateTimeFormat("en-PH", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).formatToParts(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("day")} ${part("month")} ${part("year")}`;
}

export function closedCycleNotice(end: string): string {
  return `Applications for this cycle closed on ${formatCycleDate(end)}. You can still read the guide, but Gabay only answers questions about open cycles.`;
}
