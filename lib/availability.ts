import { isDateInRange, toDateOnly } from "./dateRange";

export interface UnavailableRow { worker_id: string; date: string; end_date?: string | null; }

export function isWorkerUnavailableOnDate(workerId: string, date: string | Date, rows: UnavailableRow[]): boolean {
  const target = toDateOnly(date);
  return rows.some(r => r.worker_id === workerId && isDateInRange(target, r.date, r.end_date));
}
