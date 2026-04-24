export function generateSlots(startTime: string, endTime: string, maxJobs: number): string[] {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const interval = Math.floor((end - start) / maxJobs);

  const slots: string[] = [];
  for (let i = 0; i < maxJobs; i++) {
    const mins = start + i * interval;
    const h = Math.floor(mins / 60).toString().padStart(2, "0");
    const m = (mins % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
  }
  return slots;
}

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) +
    " at " + d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true });
}
