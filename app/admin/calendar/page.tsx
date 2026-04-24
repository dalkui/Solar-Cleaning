"use client";
import { useEffect, useState, useRef, useCallback } from "react";

interface Booking {
  id: string;
  scheduled_at: string;
  status: string;
  worker_id: string | null;
  customers: {
    id?: string;
    name: string; phone: string; email: string;
    street: string; suburb: string; state: string; postcode: string;
    plan: string; stories: string; panels: string; notes?: string;
  };
  workers?: { id: string; name: string; color: string } | null;
}

interface Worker { id: string; name: string; color: string; }
interface Availability { worker_id: string; day_of_week: number; is_active: boolean; start_time: string; end_time: string; }
interface UnavailableDate { worker_id: string; date: string; end_date?: string | null; }

function isUnavailableOn(workerId: string, dateStr: string, rows: UnavailableDate[]): boolean {
  return rows.some(u => {
    if (u.worker_id !== workerId) return false;
    const start = u.date.slice(0, 10);
    const end = (u.end_date || u.date).slice(0, 10);
    return dateStr >= start && dateStr <= end;
  });
}
interface UnscheduledItem {
  customer_id: string;
  pending_id: string | null;
  name: string; suburb: string; plan: string; panels: string; stories: string;
  due_month: string;
}

type DueFilter = "overdue" | "this_month" | "next_month" | "later" | "all";

const statusColors: Record<string, string> = {
  confirmed: "#F5C518",
  in_progress: "#60a5fa",
  completed: "#4ade80",
  cancelled: "#f87171",
  pending: "#94a3b8",
};

const planLabel: Record<string, string> = { basic: "Basic", standard: "Standard", elite: "Elite" };
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const START_HOUR = 7;
const END_HOUR = 17;
const TOTAL_MINS = (END_HOUR - START_HOUR) * 60;
const ROW_HEIGHT = 90;
const SNAP_MINS = 15;

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  return days;
}

function getLeftPercent(scheduledAt: string): number {
  const d = new Date(scheduledAt);
  const mins = d.getHours() * 60 + d.getMinutes();
  return Math.max(0, Math.min(95, ((mins - START_HOUR * 60) / TOTAL_MINS) * 100));
}

function timeStrToPercent(time: string): number {
  const [h, m] = time.split(":").map(Number);
  const mins = h * 60 + m;
  return Math.max(0, Math.min(100, ((mins - START_HOUR * 60) / TOTAL_MINS) * 100));
}

function timeStrToMins(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function snapX(x: number, width: number): number {
  const ratio = Math.max(0, Math.min(1, x / width));
  const snapped = Math.round((ratio * TOTAL_MINS) / SNAP_MINS) * SNAP_MINS;
  return snapped;
}

function snapToISO(xMins: number, date: Date): string {
  const totalMins = START_HOUR * 60 + xMins;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Australia/Sydney" });
}

function formatMinsLabel(mins: number): string {
  const totalMins = START_HOUR * 60 + mins;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const period = h >= 12 ? "pm" : "am";
  const hh = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `${hh}:${m.toString().padStart(2, "0")} ${period}`;
}

function bookingInAvailability(date: Date, workerId: string, availability: Availability[], unavailable: UnavailableDate[]): boolean {
  const dateStr = date.toLocaleDateString("en-CA");
  if (isUnavailableOn(workerId, dateStr, unavailable)) return false;
  const avail = availability.find(a => a.worker_id === workerId && a.day_of_week === date.getDay());
  if (!avail || !avail.is_active) return false;
  const mins = date.getHours() * 60 + date.getMinutes();
  return mins >= timeStrToMins(avail.start_time) && mins < timeStrToMins(avail.end_time);
}

function minsInAvailability(mins: number, workerId: string, dayOfWeek: number, dateStr: string, availability: Availability[], unavailable: UnavailableDate[]): boolean {
  if (isUnavailableOn(workerId, dateStr, unavailable)) return false;
  const avail = availability.find(a => a.worker_id === workerId && a.day_of_week === dayOfWeek);
  if (!avail || !avail.is_active) return false;
  const absMins = START_HOUR * 60 + mins;
  return absMins >= timeStrToMins(avail.start_time) && absMins < timeStrToMins(avail.end_time);
}

export default function CalendarPage() {
  const now = new Date();
  const [view, setView] = useState<"day" | "month">("day");
  const [monthOffset, setMonthOffset] = useState(0);
  const [dayOffset, setDayOffset] = useState(() => {
    if (typeof window === "undefined") return 0;
    const stored = sessionStorage.getItem("cal-day-offset");
    return stored ? parseInt(stored, 10) : 0;
  });

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [unscheduled, setUnscheduled] = useState<UnscheduledItem[]>([]);
  const [dueFilter, setDueFilter] = useState<DueFilter>(() => {
    if (typeof window === "undefined") return "this_month";
    const params = new URLSearchParams(window.location.search);
    const f = params.get("filter");
    if (f === "overdue" || f === "this_month" || f === "next_month" || f === "later" || f === "all") return f;
    return "this_month";
  });

  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Drag state
  const [dragState, setDragState] = useState<{
    type: "booking" | "unscheduled";
    id: string; // booking id or pending_id
    customerId?: string;
    label: string;
    hoverRow: string | null;
    hoverMins: number | null;
    blocked: boolean;
    mouseX: number;
    mouseY: number;
  } | null>(null);

  // Click-to-schedule popover
  const [schedulePop, setSchedulePop] = useState<{ workerId: string | null; mins: number; x: number; y: number } | null>(null);

  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selectedDay = new Date(now);
  selectedDay.setDate(now.getDate() + dayOffset);
  selectedDay.setHours(0, 0, 0, 0);

  const displayMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();

  useEffect(() => {
    sessionStorage.setItem("cal-day-offset", String(dayOffset));
  }, [dayOffset]);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2200);
  };

  const fetchCalendar = useCallback(async () => {
    const from = view === "day" ? new Date(selectedDay) : new Date(year, month, 1);
    const to = view === "day" ? (() => { const d = new Date(selectedDay); d.setHours(23,59,59,999); return d; })() : new Date(year, month + 1, 1);
    const r = await fetch(`/api/admin/calendar?from=${from.toISOString()}&to=${to.toISOString()}`);
    const d = await r.json();
    setWorkers(d.workers || []);
    setAvailability(d.availability || []);
    setUnavailableDates(d.unavailable_dates || []);
    setBookings(d.bookings || []);
    setUnscheduled(d.unscheduled || []);
    setLoading(false);
    setLoaded(true);
  }, [view, dayOffset, monthOffset]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (selected || schedulePop) return;
      if (e.key === "ArrowLeft") view === "day" ? setDayOffset(d => d - 1) : setMonthOffset(m => m - 1);
      else if (e.key === "ArrowRight") view === "day" ? setDayOffset(d => d + 1) : setMonthOffset(m => m + 1);
      else if (e.key.toLowerCase() === "t") { setDayOffset(0); setMonthOffset(0); }
      else if (e.key.toLowerCase() === "m") setView("month");
      else if (e.key.toLowerCase() === "d") setView("day");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, selected, schedulePop]);

  // Mouse tracking during drag (for preview)
  useEffect(() => {
    if (!dragState) return;
    const onMove = (e: MouseEvent) => {
      setDragState(prev => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null);
    };
    window.addEventListener("dragover", onMove);
    return () => window.removeEventListener("dragover", onMove);
  }, [dragState]);

  const reschedule = async (bookingId: string, workerId: string | null, newTime: string) => {
    // Optimistic update
    const prev = bookings;
    setBookings(bs => bs.map(b => b.id === bookingId ? { ...b, scheduled_at: newTime, worker_id: workerId } : b));

    const res = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker_id: workerId, scheduled_at: newTime }),
    });
    if (!res.ok) {
      setBookings(prev);
      showToast("Failed to reschedule", "err");
    } else {
      showToast("Saved");
    }
  };

  const scheduleFromUnscheduled = async (item: UnscheduledItem, workerId: string | null, newTime: string) => {
    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: item.customer_id,
        scheduled_at: newTime,
        worker_id: workerId,
        pending_booking_id: item.pending_id,
      }),
    });
    if (!res.ok) {
      showToast("Failed to create booking", "err");
      return;
    }
    showToast("Booking created");
    fetchCalendar();
  };

  const reassignWorker = async (bookingId: string, workerId: string | null) => {
    const prev = bookings;
    setBookings(bs => bs.map(b => b.id === bookingId ? { ...b, worker_id: workerId, workers: workerId ? workers.find(w => w.id === workerId) as any : null } : b));
    const res = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker_id: workerId }),
    });
    if (!res.ok) {
      setBookings(prev);
      showToast("Failed to reassign", "err");
    } else {
      showToast("Saved");
    }
  };

  const dayLabel = () => {
    if (dayOffset === 0) return "Today";
    if (dayOffset === 1) return "Tomorrow";
    if (dayOffset === -1) return "Yesterday";
    return selectedDay.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  const dateStr = selectedDay.toLocaleDateString("en-CA");
  const dayOfWeek = selectedDay.getDay();

  const rowAvailability = (workerId: string) => {
    const isOff = isUnavailableOn(workerId, dateStr, unavailableDates);
    if (isOff) return { type: "off" as const };
    const a = availability.find(av => av.worker_id === workerId && av.day_of_week === dayOfWeek);
    if (!a || !a.is_active) return { type: "unavailable" as const };
    return { type: "available" as const, start: timeStrToPercent(a.start_time), end: timeStrToPercent(a.end_time) };
  };

  const onDragOverRow = (e: React.DragEvent, workerId: string | null) => {
    e.preventDefault();
    if (!dragState) return;
    const rowEl = rowRefs.current[workerId || "unassigned"];
    if (!rowEl) return;
    const rect = rowEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const mins = snapX(x, rect.width);
    const blocked = workerId !== null && !minsInAvailability(mins, workerId, dayOfWeek, dateStr, availability, unavailableDates);
    setDragState({
      ...dragState,
      hoverRow: workerId || "unassigned",
      hoverMins: mins,
      blocked,
      mouseX: e.clientX,
      mouseY: e.clientY,
    });
  };

  const onDropRow = (e: React.DragEvent, workerId: string | null) => {
    e.preventDefault();
    if (!dragState) return;
    const rowEl = rowRefs.current[workerId || "unassigned"];
    if (!rowEl) { setDragState(null); return; }
    const rect = rowEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const mins = snapX(x, rect.width);
    const blocked = workerId !== null && !minsInAvailability(mins, workerId, dayOfWeek, dateStr, availability, unavailableDates);

    if (blocked) {
      showToast("Worker unavailable at this time", "err");
      setDragState(null);
      return;
    }

    const newTime = snapToISO(mins, selectedDay);

    if (dragState.type === "booking") {
      reschedule(dragState.id, workerId, newTime);
    } else if (dragState.type === "unscheduled") {
      const item = unscheduled.find(u => u.pending_id === dragState.id || u.customer_id === dragState.customerId);
      if (item) scheduleFromUnscheduled(item, workerId, newTime);
    }
    setDragState(null);
  };

  const openSchedulePop = (e: React.MouseEvent, workerId: string | null) => {
    if (dragState) return;
    const rowEl = rowRefs.current[workerId || "unassigned"];
    if (!rowEl) return;
    const rect = rowEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const mins = snapX(x, rect.width);
    if (workerId && !minsInAvailability(mins, workerId, dayOfWeek, dateStr, availability, unavailableDates)) {
      showToast("Worker unavailable at this time", "err");
      return;
    }
    setSchedulePop({ workerId, mins, x: e.clientX, y: e.clientY });
  };

  // Filtered unscheduled
  const filteredUnscheduled = (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    return unscheduled.filter(u => {
      const d = new Date(u.due_month + "T00:00:00");
      if (dueFilter === "all") return true;
      if (dueFilter === "overdue") return d < thisMonthStart;
      if (dueFilter === "this_month") return d >= thisMonthStart && d <= thisMonthEnd;
      if (dueFilter === "next_month") return d >= nextMonthStart && d <= nextMonthEnd;
      if (dueFilter === "later") return d > nextMonthEnd;
      return true;
    });
  })();

  const dueBadge = (dueMonth: string) => {
    const d = new Date(dueMonth + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (d < new Date(today.getFullYear(), today.getMonth(), 1)) {
      const weeks = Math.floor((today.getTime() - d.getTime()) / (7 * 24 * 60 * 60 * 1000));
      return { label: `Overdue ${weeks}w`, color: "#f87171" };
    }
    const monthsDiff = (d.getFullYear() - today.getFullYear()) * 12 + d.getMonth() - today.getMonth();
    if (monthsDiff === 0) return { label: "Due this month", color: "#F5C518" };
    if (monthsDiff === 1) return { label: "Due next month", color: "#60a5fa" };
    return { label: `Due ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`, color: "#94a3b8" };
  };

  const todayBookings = bookings.filter(b => new Date(b.scheduled_at).toDateString() === selectedDay.toDateString());
  const todayStats = {
    total: todayBookings.length,
    completed: todayBookings.filter(b => b.status === "completed").length,
    unassigned: todayBookings.filter(b => !b.worker_id).length,
  };

  const renderLane = (workerId: string | null, workerName: string, workerColor: string) => {
    const rowBookings = bookings.filter(b => (workerId ? b.worker_id === workerId : !b.worker_id))
                                .filter(b => new Date(b.scheduled_at).toDateString() === selectedDay.toDateString())
                                .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    const stopNumbers: Record<string, number> = {};
    if (workerId && rowBookings.length > 1) rowBookings.forEach((b, i) => { stopNumbers[b.id] = i + 1; });
    const overlay = workerId ? rowAvailability(workerId) : { type: "available" as const, start: 0, end: 100 };
    const isDragOver = dragState?.hoverRow === (workerId || "unassigned");
    const rowBlocked = isDragOver && dragState?.blocked;

    return (
      <div key={workerId || "unassigned"} style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: "140px", flexShrink: 0, padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px", borderRight: "1px solid var(--border)", background: "var(--bg-alt)" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: workerColor }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: workerId ? "var(--text)" : "var(--text-muted)" }}>{workerName}</span>
        </div>

        <div
          ref={el => { rowRefs.current[workerId || "unassigned"] = el; }}
          onDragOver={e => onDragOverRow(e, workerId)}
          onDragLeave={() => setDragState(prev => prev ? { ...prev, hoverRow: null } : null)}
          onDrop={e => onDropRow(e, workerId)}
          onClick={e => {
            if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.rowEmpty === "1") {
              openSchedulePop(e, workerId);
            }
          }}
          data-row-empty="1"
          style={{
            flex: 1,
            position: "relative",
            minHeight: `${ROW_HEIGHT}px`,
            background: rowBlocked ? "rgba(248,113,113,0.08)" : (isDragOver ? "rgba(74,222,128,0.04)" : "transparent"),
            transition: "background 0.15s",
            cursor: dragState ? (rowBlocked ? "not-allowed" : "copy") : "default",
          }}
        >
          {/* Day-off stripe overlay */}
          {overlay.type === "off" && (
            <div data-row-empty="1" style={{
              position: "absolute", inset: 0,
              background: "repeating-linear-gradient(45deg, rgba(248,113,113,0.06), rgba(248,113,113,0.06) 10px, rgba(248,113,113,0.12) 10px, rgba(248,113,113,0.12) 20px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}>
              <span style={{ fontSize: "11px", color: "#f87171", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Day Off</span>
            </div>
          )}

          {/* Unavailable full row */}
          {overlay.type === "unavailable" && (
            <div data-row-empty="1" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", pointerEvents: "none" }} />
          )}

          {/* Partial availability overlays */}
          {overlay.type === "available" && (
            <>
              {overlay.start > 0 && <div data-row-empty="1" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${overlay.start}%`, background: "rgba(0,0,0,0.35)", pointerEvents: "none" }} />}
              {overlay.end < 100 && <div data-row-empty="1" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${100 - overlay.end}%`, background: "rgba(0,0,0,0.35)", pointerEvents: "none" }} />}
              <div data-row-empty="1" style={{ position: "absolute", left: `${overlay.start}%`, width: `${overlay.end - overlay.start}%`, top: 0, bottom: 0, background: "rgba(245,197,24,0.02)", pointerEvents: "none" }} />
            </>
          )}

          {/* Hour grid lines */}
          {hours.map((h, i) => (
            <div key={h} data-row-empty="1" style={{
              position: "absolute",
              left: `${(i / (hours.length - 1)) * 100}%`,
              top: 0, bottom: 0,
              borderLeft: "1px solid rgba(255,255,255,0.04)",
              pointerEvents: "none",
            }} />
          ))}

          {/* Drop indicator */}
          {isDragOver && dragState?.hoverMins !== null && dragState?.hoverMins !== undefined && (
            <div style={{
              position: "absolute",
              left: `${(dragState.hoverMins / TOTAL_MINS) * 100}%`,
              top: 0, bottom: 0,
              width: "2px",
              background: rowBlocked ? "#f87171" : "#F5C518",
              zIndex: 5,
              pointerEvents: "none",
              boxShadow: rowBlocked ? "0 0 8px rgba(248,113,113,0.6)" : "0 0 8px rgba(245,197,24,0.6)",
            }}>
              <div style={{
                position: "absolute",
                top: "-24px",
                left: "50%",
                transform: "translateX(-50%)",
                background: rowBlocked ? "#f87171" : "#F5C518",
                color: "#08101C",
                fontSize: "10px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "4px",
                whiteSpace: "nowrap",
              }}>
                {rowBlocked ? "Unavailable" : formatMinsLabel(dragState.hoverMins)}
              </div>
            </div>
          )}

          {/* Job cards */}
          {rowBookings.map(b => {
            const color = b.workers?.color || statusColors[b.status] || "#F5C518";
            const statusBorder = statusColors[b.status] || color;
            const isUnassigned = !b.worker_id;
            return (
              <div
                key={b.id}
                draggable
                onDragStart={e => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", b.id);
                  setDragState({
                    type: "booking",
                    id: b.id,
                    label: `${formatTime(b.scheduled_at)} ${b.customers?.name?.split(" ")[0]}`,
                    hoverRow: null,
                    hoverMins: null,
                    blocked: false,
                    mouseX: e.clientX,
                    mouseY: e.clientY,
                  });
                }}
                onDragEnd={() => setDragState(null)}
                onClick={e => { e.stopPropagation(); setSelected(b); }}
                onDoubleClick={e => {
                  e.stopPropagation();
                  const input = prompt("New time (HH:MM, 24h):", new Date(b.scheduled_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false }));
                  if (!input) return;
                  const m = input.match(/^(\d{1,2}):(\d{2})$/);
                  if (!m) return showToast("Bad time format", "err");
                  const nd = new Date(b.scheduled_at);
                  nd.setHours(parseInt(m[1]), parseInt(m[2]), 0, 0);
                  reschedule(b.id, b.worker_id, nd.toISOString());
                }}
                style={{
                  position: "absolute",
                  left: `${getLeftPercent(b.scheduled_at)}%`,
                  top: "8px",
                  width: "140px",
                  background: `${color}22`,
                  border: `1px solid ${color}`,
                  borderLeft: `3px solid ${statusBorder}`,
                  borderRadius: "6px",
                  padding: "6px 8px",
                  cursor: "grab",
                  zIndex: 2,
                  userSelect: "none",
                  opacity: dragState?.id === b.id ? 0.4 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <p style={{ fontSize: "10px", fontWeight: 700, color }}>{formatTime(b.scheduled_at)}</p>
                    {stopNumbers[b.id] && (
                      <span style={{ fontSize: "8px", fontWeight: 700, color: "#94a3b8", background: "rgba(148,163,184,0.15)", padding: "1px 5px", borderRadius: "3px" }}>
                        {stopNumbers[b.id]}
                      </span>
                    )}
                  </div>
                  {isUnassigned && <span style={{ fontSize: "8px", fontWeight: 700, color: "#f87171", background: "rgba(248,113,113,0.2)", padding: "1px 5px", borderRadius: "3px", letterSpacing: "0.05em" }}>!</span>}
                </div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.customers?.name?.split(" ")[0]}</p>
                <p style={{ fontSize: "10px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.customers?.suburb}</p>
              </div>
            );
          })}

          {rowBookings.length === 0 && !isDragOver && overlay.type !== "off" && overlay.type !== "unavailable" && (
            <p data-row-empty="1" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", color: "rgba(122,149,176,0.3)", fontSize: "11px", pointerEvents: "none" }}>
              Drop or click to schedule
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 className="display" style={{ fontSize: "28px" }}>
            {view === "day" ? dayLabel() : `${MONTH_NAMES[month]} ${year}`}
          </h1>
          {view === "day" && (
            <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
              {selectedDay.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ display: "flex", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
            {(["day", "month"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "8px 16px", background: view === v ? "rgba(245,197,24,0.15)" : "transparent", color: view === v ? "var(--gold)" : "var(--text-muted)", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: view === v ? 700 : 400 }}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={() => view === "day" ? setDayOffset(d => d - 1) : setMonthOffset(m => m - 1)} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 14px", color: "var(--text)", cursor: "pointer" }}>←</button>
          <button onClick={() => { setDayOffset(0); setMonthOffset(0); }} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 14px", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px" }}>Today</button>
          <button onClick={() => view === "day" ? setDayOffset(d => d + 1) : setMonthOffset(m => m + 1)} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 14px", color: "var(--text)", cursor: "pointer" }}>→</button>
        </div>
      </div>

      {/* Today summary */}
      {view === "day" && loaded && (
        <div style={{ display: "flex", gap: "14px", marginBottom: "12px", fontSize: "12px" }}>
          <span style={{ color: "var(--text-muted)" }}><strong style={{ color: "var(--text)" }}>{todayStats.total}</strong> jobs</span>
          <span style={{ color: "var(--text-muted)" }}><strong style={{ color: "#4ade80" }}>{todayStats.completed}</strong> completed</span>
          {todayStats.unassigned > 0 && <span style={{ color: "var(--text-muted)" }}><strong style={{ color: "#f87171" }}>{todayStats.unassigned}</strong> unassigned</span>}
          <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "11px" }}>Shortcuts: ← → T D M</span>
        </div>
      )}

      {view === "day" && (
        <div style={{ display: "flex", gap: "16px", flex: 1, minHeight: 0 }}>
          {/* Swim lanes */}
          <div style={{ flex: 1, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0 }}>
            {/* Hour header */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: "140px", flexShrink: 0, padding: "10px 14px", background: "var(--bg-alt)", borderRight: "1px solid var(--border)" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Worker</span>
              </div>
              <div style={{ flex: 1, position: "relative", padding: "10px 0" }}>
                {hours.map((h, i) => (
                  <span key={h} style={{
                    position: "absolute",
                    left: `${(i / (hours.length - 1)) * 100}%`,
                    top: "10px",
                    transform: "translateX(4px)",
                    fontSize: "10px",
                    color: "var(--text-muted)",
                  }}>
                    {h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}
                  </span>
                ))}
              </div>
            </div>

            {/* Skeleton */}
            {loading && !loaded && (
              <>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ width: "140px", flexShrink: 0, padding: "10px 14px", background: "var(--bg-alt)", borderRight: "1px solid var(--border)" }}>
                      <div style={{ height: "12px", width: "80px", background: "rgba(255,255,255,0.05)", borderRadius: "4px" }} />
                    </div>
                    <div style={{ flex: 1, minHeight: `${ROW_HEIGHT}px`, position: "relative" }}>
                      <div style={{ position: "absolute", left: "10%", top: "20px", width: "100px", height: "50px", background: "rgba(255,255,255,0.03)", borderRadius: "6px" }} />
                    </div>
                  </div>
                ))}
              </>
            )}

            {!loading && (
              <>
                {renderLane(null, "Unassigned", "#94a3b8")}
                {workers.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center" }}>
                    <p style={{ color: "var(--text-muted)", marginBottom: "8px" }}>No workers yet</p>
                    <a href="/admin/workers" className="btn btn-gold" style={{ fontSize: "13px" }}>Add Workers</a>
                  </div>
                ) : (
                  workers.map(w => renderLane(w.id, w.name, w.color))
                )}
              </>
            )}
          </div>

          {/* Unscheduled panel */}
          <div style={{ width: "240px", flexShrink: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
              Unscheduled ({filteredUnscheduled.length})
            </p>

            {/* Filter */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "10px" }}>
              {([
                ["overdue", "Overdue"],
                ["this_month", "This Month"],
                ["next_month", "Next Month"],
                ["later", "Later"],
                ["all", "All"],
              ] as [DueFilter, string][]).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setDueFilter(v)}
                  style={{
                    padding: "6px 8px",
                    background: dueFilter === v ? "rgba(245,197,24,0.15)" : "var(--bg-card)",
                    color: dueFilter === v ? "var(--gold)" : "var(--text-muted)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: dueFilter === v ? 700 : 500,
                    cursor: "pointer",
                  }}
                >{label}</button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", flex: 1 }}>
              {filteredUnscheduled.length === 0 ? (
                <p style={{ fontSize: "12px", color: "var(--text-muted)", padding: "8px 0" }}>None in this filter</p>
              ) : (
                filteredUnscheduled.map(c => {
                  const badge = dueBadge(c.due_month);
                  return (
                    <div
                      key={c.pending_id || c.customer_id}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.effectAllowed = "copy";
                        e.dataTransfer.setData("text/plain", c.customer_id);
                        setDragState({
                          type: "unscheduled",
                          id: c.pending_id || c.customer_id,
                          customerId: c.customer_id,
                          label: c.name,
                          hoverRow: null,
                          hoverMins: null,
                          blocked: false,
                          mouseX: e.clientX,
                          mouseY: e.clientY,
                        });
                      }}
                      onDragEnd={() => setDragState(null)}
                      style={{ background: "var(--bg-card)", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: "8px", padding: "10px 12px", cursor: "grab", userSelect: "none" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                        <p style={{ fontSize: "13px", fontWeight: 600 }}>{c.name}</p>
                        <span style={{ fontSize: "9px", fontWeight: 700, color: badge.color, background: `${badge.color}22`, padding: "2px 6px", borderRadius: "999px", whiteSpace: "nowrap" }}>
                          {badge.label}
                        </span>
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{c.suburb}</p>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{planLabel[c.plan]} · {c.panels} panels</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {view === "month" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "4px" }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", padding: "8px 0", letterSpacing: "0.05em" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {getMonthDays(year, month).map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const isToday = day.toDateString() === now.toDateString();
              const dStr = day.toLocaleDateString("en-CA");
              const dayBookings = bookings.filter(b => b.scheduled_at && b.scheduled_at.startsWith(dStr));
              const byWorker: Record<string, { color: string; count: number }> = {};
              dayBookings.forEach(b => {
                const key = b.worker_id || "unassigned";
                const color = b.workers?.color || "#94a3b8";
                if (!byWorker[key]) byWorker[key] = { color, count: 0 };
                byWorker[key].count++;
              });
              return (
                <div
                  key={i}
                  onClick={() => { setView("day"); setDayOffset(Math.round((day.getTime() - new Date().setHours(0,0,0,0)) / 86400000)); }}
                  style={{ background: "var(--bg-card)", border: `1px solid ${isToday ? "rgba(245,197,24,0.4)" : "var(--border)"}`, borderRadius: "8px", minHeight: "90px", padding: "8px", cursor: "pointer" }}
                >
                  <p style={{ fontSize: "13px", fontWeight: isToday ? 700 : 400, color: isToday ? "var(--gold)" : "var(--text-muted)", textAlign: "right", marginBottom: "6px" }}>{day.getDate()}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                    {Object.entries(byWorker).map(([key, { color, count }]) => (
                      Array.from({ length: count }).map((_, j) => (
                        <div key={`${key}-${j}`} style={{ width: "8px", height: "8px", borderRadius: "50%", background: color }} />
                      ))
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Click-to-schedule popover */}
      {schedulePop && (
        <div onClick={() => setSchedulePop(null)} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.4)" }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: "fixed",
            left: Math.min(schedulePop.x, window.innerWidth - 300),
            top: Math.min(schedulePop.y, window.innerHeight - 400),
            width: "280px",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "14px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            maxHeight: "400px",
            overflowY: "auto",
          }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
              Schedule at {formatMinsLabel(schedulePop.mins)}
            </p>
            {filteredUnscheduled.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", padding: "12px 0" }}>No customers due</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {filteredUnscheduled.map(c => (
                  <button
                    key={c.pending_id || c.customer_id}
                    onClick={() => {
                      const newTime = snapToISO(schedulePop.mins, selectedDay);
                      scheduleFromUnscheduled(c, schedulePop.workerId, newTime);
                      setSchedulePop(null);
                    }}
                    style={{ textAlign: "left", padding: "10px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", cursor: "pointer", color: "var(--text)" }}
                  >
                    <p style={{ fontSize: "13px", fontWeight: 600 }}>{c.name}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{c.suburb} · {planLabel[c.plan]}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drag ghost following cursor */}
      {dragState && dragState.mouseX && (
        <div style={{
          position: "fixed",
          left: dragState.mouseX + 12,
          top: dragState.mouseY + 12,
          background: "var(--bg-card)",
          border: `1px solid ${dragState.blocked ? "#f87171" : "#F5C518"}`,
          borderRadius: "6px",
          padding: "6px 10px",
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--text)",
          pointerEvents: "none",
          zIndex: 100,
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}>
          {dragState.label}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: toast.type === "ok" ? "#0F1E30" : "rgba(248,113,113,0.15)",
          border: `1px solid ${toast.type === "ok" ? "#4ade80" : "#f87171"}`,
          color: toast.type === "ok" ? "#4ade80" : "#f87171",
          padding: "12px 18px",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: 600,
          zIndex: 100,
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}>
          {toast.msg}
        </div>
      )}

      {/* Job detail modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setSelected(null)}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "28px", maxWidth: "480px", width: "90%", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>{selected.customers?.name}</h3>
                <span style={{ fontSize: "12px", fontWeight: 600, color: statusColors[selected.status], textTransform: "capitalize" }}>{selected.status.replace("_", " ")}</span>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "20px" }}>×</button>
            </div>

            {[
              ["Time", formatTime(selected.scheduled_at)],
              ["Phone", selected.customers?.phone],
              ["Address", `${selected.customers?.street}, ${selected.customers?.suburb} ${selected.customers?.postcode}`],
              ["Plan", planLabel[selected.customers?.plan] || selected.customers?.plan],
              ["Storey", selected.customers?.stories],
              ["Panels", selected.customers?.panels],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "10px" }}>
                <span style={{ color: "var(--text-muted)" }}>{label}</span>
                <span style={{ fontWeight: 500, textAlign: "right", maxWidth: "65%" }}>{value || "—"}</span>
              </div>
            ))}

            <div style={{ marginTop: "18px", paddingTop: "18px", borderTop: "1px solid var(--border)" }}>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Assigned Worker</label>
              <select
                value={selected.worker_id || ""}
                onChange={e => {
                  const newWorkerId = e.target.value || null;
                  reassignWorker(selected.id, newWorkerId);
                  setSelected({ ...selected, worker_id: newWorkerId });
                }}
                style={{ width: "100%", padding: "10px 12px", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "14px" }}
              >
                <option value="">— Unassigned —</option>
                {workers.map(w => {
                  const d = new Date(selected.scheduled_at);
                  const ok = bookingInAvailability(d, w.id, availability, unavailableDates);
                  return (
                    <option key={w.id} value={w.id} disabled={!ok}>
                      {w.name}{!ok ? " (unavailable)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(`${selected.customers?.street}, ${selected.customers?.suburb} ${selected.customers?.postcode}`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-gold" style={{ flex: 1, fontSize: "13px", textAlign: "center" }}>
                Open in Maps →
              </a>
              {selected.customers?.id && (
                <a href={`/admin/customers/${selected.customers.id}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", color: "var(--gold)", textDecoration: "none", border: "1px solid rgba(245,197,24,0.3)", borderRadius: "8px" }}>
                  Full Profile →
                </a>
              )}
            </div>

            {/* Remove from calendar */}
            <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px" }}>
              <button
                onClick={async () => {
                  if (!confirm("Remove this booking from the calendar? The customer will go back to the unscheduled list.")) return;
                  const prev = bookings;
                  setBookings(bs => bs.filter(b => b.id !== selected.id));
                  setSelected(null);
                  const res = await fetch(`/api/admin/bookings/${selected.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ scheduled_at: null, worker_id: null, status: "pending" }),
                  });
                  if (!res.ok) { setBookings(prev); showToast("Failed to remove", "err"); }
                  else { showToast("Removed from calendar"); fetchCalendar(); }
                }}
                style={{ flex: 1, padding: "10px", background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              >
                Unschedule
              </button>
              <button
                onClick={async () => {
                  if (!confirm("Cancel this booking permanently? This removes it entirely — the customer won't reappear in the unscheduled list.")) return;
                  const prev = bookings;
                  setBookings(bs => bs.filter(b => b.id !== selected.id));
                  setSelected(null);
                  const res = await fetch(`/api/admin/bookings/${selected.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "cancelled" }),
                  });
                  if (!res.ok) { setBookings(prev); showToast("Failed to cancel", "err"); }
                  else { showToast("Booking cancelled"); fetchCalendar(); }
                }}
                style={{ flex: 1, padding: "10px", background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
