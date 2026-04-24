"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sun, SunMedium, Moon, Calendar, Clock, MapPin, Phone,
  CheckCircle, Bell, CreditCard, Star, Sparkles, Zap,
  AlertTriangle, ArrowRight, LogOut, ChevronRight, ChevronDown, XCircle,
} from "lucide-react";
import { Card } from "@/components/portal/Card";
import { Badge } from "@/components/portal/Badge";
import { SectionHeader } from "@/components/portal/SectionHeader";
import { SkeletonCard, Skeleton } from "@/components/portal/Skeleton";
import { WorkerAvatar } from "@/components/portal/WorkerAvatar";
import { useToast } from "@/components/portal/Toast";
import { getUpcomingProjections, planMonths } from "@/lib/clean-dates";

interface Customer {
  id: string; name: string; email: string; phone: string; plan: string;
  auto_schedule: boolean; payment_status?: string; subscribed_at: string;
}
interface Booking {
  id: string; scheduled_at: string | null; status: string; due_month?: string | null;
  workers?: { id: string; name: string; color: string } | null;
}
interface Message {
  id: string; subject?: string; body: string; purpose: string; channel: string; created_at: string;
}

const planLabel: Record<string, string> = { basic: "Basic", standard: "Standard", elite: "Elite" };

function GreetingIcon() {
  const h = new Date().getHours();
  if (h < 12) return <Sun size={18} color="#F5C518" />;
  if (h < 18) return <SunMedium size={18} color="#F5C518" />;
  return <Moon size={18} color="#F5C518" />;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Sydney" });
}
function formatTime(d: Date) {
  return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Australia/Sydney" });
}
function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = d.getTime() - Date.now();
  const diffDays = Math.round(diffMs / 86400000);
  const diffHrs = Math.round(diffMs / 3600000);

  if (diffDays === 0 && diffHrs >= -2) return formatTime(d);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === -1) return "yesterday";
  if (diffDays > 1 && diffDays <= 7) return `in ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${-diffDays} days ago`;
  if (diffDays > 7) return `in ${Math.round(diffDays / 7)} weeks`;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Sydney" });
}

function purposeIcon(purpose: string, size = 14) {
  const props = { size };
  switch (purpose) {
    case "confirmation": return <CheckCircle {...props} />;
    case "reminder": return <Bell {...props} />;
    case "reschedule_request":
    case "reschedule": return <Calendar {...props} />;
    case "payment": return <CreditCard {...props} />;
    case "review": return <Star {...props} />;
    case "cancellation": return <XCircle {...props} />;
    default: return <Bell {...props} />;
  }
}

export default function PortalHome() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<{ customer: Customer; bookings: Booking[]; messages: Message[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reschedOpen, setReschedOpen] = useState<string | null>(null);
  const [reschedDate, setReschedDate] = useState("");
  const [reschedNote, setReschedNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  const load = async () => {
    const r = await fetch("/api/portal/me");
    if (r.status === 401) { router.push("/portal/login"); return; }
    const d = await r.json();
    setData(d);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const logout = async () => {
    await fetch("/api/portal/logout", { method: "POST" });
    router.push("/portal/login");
  };

  if (loading || !data) {
    return (
      <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <Skeleton width="50%" height={28} />
        <Skeleton width="35%" height={14} />
        <div style={{ marginTop: "8px" }}><SkeletonCard height={180} /></div>
        <SkeletonCard height={90} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          <SkeletonCard height={90} />
          <SkeletonCard height={90} />
          <SkeletonCard height={90} />
        </div>
      </div>
    );
  }

  const { customer, bookings, messages } = data;
  const nextScheduled = bookings
    .filter(b => (b.status === "confirmed" || b.status === "in_progress") && b.scheduled_at && new Date(b.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0];

  const projections = getUpcomingProjections(
    { plan: customer.plan, subscribed_at: customer.subscribed_at },
    bookings,
    1,
  );
  const nextProjected = projections[0];

  const completedCount = bookings.filter(b => b.status === "completed").length;
  const monthsCustomer = Math.max(
    0,
    Math.round((Date.now() - new Date(customer.subscribed_at).getTime()) / (30 * 86400000))
  );
  const efficiencyGain = Math.round(completedCount * 5 * Math.pow(0.85, Math.max(0, completedCount - 1)));

  const submitReschedule = async (bookingId: string) => {
    setSubmitting(true);
    const res = await fetch("/api/portal/reschedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, preferred_date: reschedDate, note: reschedNote }),
    });
    setSubmitting(false);
    setReschedOpen(null); setReschedDate(""); setReschedNote("");
    if (res.ok) toast("Reschedule request sent — we'll reach out soon");
    else toast("Something went wrong. Try again.", "error");
  };

  const cancelBooking = async (bookingId: string) => {
    if (!confirm("Cancel this upcoming clean? We'll schedule a replacement for a later date.")) return;
    const res = await fetch("/api/portal/cancel-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId }),
    });
    if (res.ok) { toast("Booking cancelled"); load(); }
    else toast("Couldn't cancel. Try again.", "error");
  };

  const subscribedLabel = new Date(customer.subscribed_at).toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "Australia/Sydney" });

  return (
    <div style={{ padding: "24px 20px" }}>
      {/* Greeting hero */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#7A95B0", fontSize: "13px" }}>
            <GreetingIcon />
            <span>{greeting()}</span>
          </div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, letterSpacing: "-0.02em", marginTop: "4px" }}>
            {customer.name?.split(" ")[0] || "there"}
          </h1>
          <p style={{ fontSize: "12px", color: "#7A95B0", marginTop: "2px" }}>
            {planLabel[customer.plan] || customer.plan} plan · since {subscribedLabel}
          </p>
        </div>
        <button
          onClick={logout}
          aria-label="Sign out"
          className="portal-btn portal-focus"
          style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#7A95B0", padding: "8px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Payment alert */}
      {customer.payment_status === "past_due" && (
        <Card accent="#f87171" style={{ marginBottom: "18px", background: "rgba(248,113,113,0.06)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <AlertTriangle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#f87171", marginBottom: "4px" }}>Payment didn't go through</p>
              <p style={{ fontSize: "13px", color: "#EFF4FF", lineHeight: 1.5, marginBottom: "10px" }}>Update your card to keep your cleans running without interruption.</p>
              <a href="/portal/account" className="portal-btn" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#f87171", fontWeight: 600, textDecoration: "none", padding: "6px 12px", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "8px" }}>
                Update card <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </Card>
      )}

      {/* Next clean hero */}
      <section style={{ marginBottom: "20px" }}>
        <SectionHeader>Next Clean</SectionHeader>
        {nextScheduled ? (
          <Card accent="#F5C518" padding="20px">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
              <div>
                <p style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em", color: "#EFF4FF" }} className="tabular-nums">
                  {formatDate(new Date(nextScheduled.scheduled_at!))}
                </p>
                <p style={{ fontSize: "15px", color: "#F5C518", fontWeight: 600, marginTop: "2px" }} className="tabular-nums">
                  {formatTime(new Date(nextScheduled.scheduled_at!))} · {relativeTime(nextScheduled.scheduled_at!)}
                </p>
              </div>
              <Badge tone={nextScheduled.status === "in_progress" ? "in_progress" : "scheduled"} label={nextScheduled.status === "in_progress" ? "In progress" : "Scheduled"} />
            </div>
            {nextScheduled.workers && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <WorkerAvatar name={nextScheduled.workers.name} color={nextScheduled.workers.color} size={32} />
                <div>
                  <p style={{ fontSize: "11px", color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em" }}>Your worker</p>
                  <p style={{ fontSize: "14px", fontWeight: 600 }}>{nextScheduled.workers.name}</p>
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setReschedOpen(nextScheduled.id)} className="portal-btn portal-focus" style={{ flex: 1, padding: "11px", background: "rgba(245,197,24,0.08)", color: "#F5C518", border: "1px solid rgba(245,197,24,0.25)", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <Clock size={14} /> Reschedule
              </button>
              <button onClick={() => cancelBooking(nextScheduled.id)} className="portal-btn portal-focus" style={{ flex: 1, padding: "11px", background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "10px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </Card>
        ) : nextProjected ? (
          <Card accent="#94a3b8" padding="20px">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#EFF4FF" }}>Coming up soon</p>
              <Badge tone={nextProjected.source === "pending" ? "pending" : "projected"} label={nextProjected.source === "pending" ? "Pending" : "Projected"} />
            </div>
            <p style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.02em", color: "#F5C518" }} className="tabular-nums">
              {nextProjected.date.toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "Australia/Sydney" })}
            </p>
            <p style={{ fontSize: "13px", color: "#7A95B0", marginTop: "8px", lineHeight: 1.5 }}>
              {customer.auto_schedule
                ? "We'll pick a time and confirm with you closer to the date."
                : "Watch for an email with a link to pick your preferred time."}
            </p>
          </Card>
        ) : (
          <Card padding="20px">
            <p style={{ fontSize: "14px", color: "#EFF4FF", fontWeight: 600, marginBottom: "4px" }}>Your first clean is being scheduled</p>
            <p style={{ fontSize: "13px", color: "#7A95B0", lineHeight: 1.5 }}>We'll email you the date once it's confirmed.</p>
          </Card>
        )}
      </section>

      {/* Stats row */}
      <section style={{ marginBottom: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          <Card padding="14px">
            <Sparkles size={16} color="#F5C518" style={{ marginBottom: "6px" }} />
            <p style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em" }} className="tabular-nums">{completedCount}</p>
            <p style={{ fontSize: "11px", color: "#7A95B0", marginTop: "2px" }}>{completedCount === 1 ? "clean done" : "cleans done"}</p>
          </Card>
          <Card padding="14px">
            <Calendar size={16} color="#F5C518" style={{ marginBottom: "6px" }} />
            <p style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em" }} className="tabular-nums">{monthsCustomer}</p>
            <p style={{ fontSize: "11px", color: "#7A95B0", marginTop: "2px" }}>{monthsCustomer === 1 ? "month" : "months"} with us</p>
          </Card>
          <Card padding="14px">
            <Zap size={16} color="#F5C518" style={{ marginBottom: "6px" }} />
            <p style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em" }} className="tabular-nums">~{efficiencyGain}%</p>
            <p style={{ fontSize: "11px", color: "#7A95B0", marginTop: "2px" }}>efficiency gain</p>
          </Card>
        </div>
      </section>

      {/* Plan Cycle */}
      <section style={{ marginBottom: "20px" }}>
        <SectionHeader>Plan Cycle</SectionHeader>
        <Card padding="18px 18px 16px">
          <PlanCycleBar customer={customer} bookings={bookings} />
          <p style={{ fontSize: "12px", color: "#7A95B0", marginTop: "10px", lineHeight: 1.5 }}>
            Started {subscribedLabel} · {completedCount} clean{completedCount !== 1 ? "s" : ""} done · Next clean every {planMonths(customer.plan)} months
          </p>
        </Card>
      </section>

      {/* Recent activity — collapsible */}
      {messages.length > 0 && (
        <section style={{ marginBottom: "20px" }}>
          <Card padding="0">
            <button
              onClick={() => setActivityOpen(o => !o)}
              aria-expanded={activityOpen}
              className="portal-btn portal-focus"
              style={{
                width: "100%",
                padding: "16px 18px",
                background: "transparent",
                border: "none",
                color: "#EFF4FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(245,197,24,0.08)", color: "#F5C518", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Bell size={14} />
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#EFF4FF" }}>Recent Activity</p>
                  <p style={{ fontSize: "11px", color: "#7A95B0", marginTop: "1px" }}>
                    {messages.length} notification{messages.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <ChevronDown
                size={18}
                color="#7A95B0"
                style={{
                  transition: "transform 0.2s",
                  transform: activityOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            {activityOpen && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                {messages.slice(0, 10).map((m, i) => (
                  <div key={m.id} style={{ padding: "12px 18px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "flex-start", gap: "12px", animation: "fadeIn 0.2s ease-out" }}>
                    <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(245,197,24,0.08)", color: "#F5C518", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {purposeIcon(m.purpose)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#EFF4FF", textTransform: "capitalize" }}>{(m.subject || m.purpose).replace(/_/g, " ")}</p>
                        <span style={{ fontSize: "11px", color: "#7A95B0", whiteSpace: "nowrap" }}>{relativeTime(m.created_at)}</span>
                      </div>
                      <p style={{ fontSize: "12px", color: "#7A95B0", lineHeight: 1.4, marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {m.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      )}

      {/* Reschedule modal */}
      {reschedOpen && (
        <div onClick={() => setReschedOpen(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", animation: "fadeIn 0.2s ease-out" }}>
          <div onClick={e => e.stopPropagation()} className="portal-pop-in" style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "400px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(245,197,24,0.12)", color: "#F5C518", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock size={16} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Request reschedule</h3>
            </div>
            <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "16px", lineHeight: 1.5 }}>A real human will reach out within a day to confirm a new time.</p>

            <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Preferred date (optional)</label>
            <input type="date" value={reschedDate} onChange={e => setReschedDate(e.target.value)} className="portal-focus" style={{ width: "100%", padding: "11px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "14px", marginBottom: "14px" }} />

            <label style={{ fontSize: "11px", color: "#7A95B0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>Note (optional)</label>
            <textarea value={reschedNote} onChange={e => setReschedNote(e.target.value)} placeholder="e.g. I'd prefer mornings" rows={3} className="portal-focus" style={{ width: "100%", padding: "11px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "14px", resize: "vertical", fontFamily: "inherit", marginBottom: "16px" }} />

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setReschedOpen(null)} className="portal-btn" style={{ flex: 1, padding: "12px", background: "transparent", color: "#7A95B0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "14px", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => submitReschedule(reschedOpen)} disabled={submitting} className="portal-btn" style={{ flex: 1, padding: "12px", background: "#F5C518", color: "#08101C", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>{submitting ? "Sending…" : "Request"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanCycleBar({ customer, bookings }: { customer: Customer; bookings: Booking[] }) {
  const projections = getUpcomingProjections({ plan: customer.plan, subscribed_at: customer.subscribed_at }, bookings, 4);
  const completed = bookings.filter(b => b.status === "completed").length;

  // Build timeline: start dot + up to 3 completed + up to 4 upcoming
  const dots: Array<{ type: "start" | "completed" | "scheduled" | "pending" | "projected"; label?: string }> = [];
  dots.push({ type: "start" });
  for (let i = 0; i < Math.min(completed, 3); i++) dots.push({ type: "completed" });
  projections.forEach(p => {
    dots.push({ type: p.source === "projected" ? "projected" : (p.source === "pending" ? "pending" : "scheduled") });
  });

  const colorOf = (t: string) => ({
    start: "#94a3b8", completed: "#4ade80", scheduled: "#F5C518",
    pending: "#F5C518", projected: "rgba(255,255,255,0.2)",
  }[t]) || "#94a3b8";

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "4px", paddingTop: "4px" }}>
      {dots.map((d, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div style={{ flex: 1, height: "2px", background: "rgba(255,255,255,0.06)" }} />}
          <div style={{
            width: d.type === "start" ? "10px" : "12px",
            height: d.type === "start" ? "10px" : "12px",
            borderRadius: "50%",
            background: d.type === "projected" ? "transparent" : colorOf(d.type),
            border: d.type === "projected" || d.type === "pending" ? `2px dashed ${colorOf(d.type)}` : d.type === "scheduled" ? `2px solid ${colorOf(d.type)}` : "none",
            flexShrink: 0,
          }} />
        </React.Fragment>
      ))}
    </div>
  );
}
