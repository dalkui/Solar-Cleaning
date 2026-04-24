export function toDateOnly(input: string | Date): string {
  if (input instanceof Date) {
    return `${input.getFullYear()}-${String(input.getMonth() + 1).padStart(2, "0")}-${String(input.getDate()).padStart(2, "0")}`;
  }
  return input.slice(0, 10);
}

export function isDateInRange(date: string | Date, start: string, end: string | null | undefined): boolean {
  const d = toDateOnly(date);
  const s = start.slice(0, 10);
  const e = (end || start).slice(0, 10);
  return d >= s && d <= e;
}

export function eachDayOfInterval(start: string, end: string): string[] {
  const days: string[] = [];
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    days.push(toDateOnly(d));
  }
  return days;
}

export function rangeLength(start: string, end: string | null | undefined): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date((end || start) + "T00:00:00");
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

export function formatRangeLabel(start: string, end: string | null | undefined): string {
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date((end || start) + "T00:00:00");
  const sameDay = start.slice(0, 10) === (end || start).slice(0, 10);
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  if (sameDay) {
    return startDate.toLocaleDateString("en-AU", { ...opts, ...(sameYear ? {} : { year: "numeric" }) });
  }
  return `${startDate.toLocaleDateString("en-AU", opts)} → ${endDate.toLocaleDateString("en-AU", { ...opts, ...(sameYear ? {} : { year: "numeric" }) })}`;
}
