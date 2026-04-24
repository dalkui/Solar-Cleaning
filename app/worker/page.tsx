"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sun, SunMedium, Moon, MapPin, Phone, Camera, StickyNote, Flag,
  Mic, LogOut, CheckCircle, Clock, ChevronDown, ChevronUp, ArrowRight,
  AlertCircle, Sparkles, Smartphone, PhoneCall, Route,
} from "lucide-react";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/Toast";

interface Booking {
  id: string;
  scheduled_at: string;
  status: string;
  customers: {
    name: string; phone: string; email: string;
    street: string; suburb: string; state: string; postcode: string;
    plan: string; panels: string; stories: string; notes?: string;
  };
}

const planLabel: Record<string, string> = { basic: "Basic", standard: "Standard", elite: "Elite" };

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Australia/Sydney" });
}

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

function mapsUrl(c: Booking["customers"]) {
  return `https://maps.google.com/?q=${encodeURIComponent(`${c.street}, ${c.suburb} ${c.postcode} ${c.state}`)}`;
}

interface WeatherInfo { temp: number; code: number; }
function weatherLabel(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Clear skies — great for cleans", icon: "☀" };
  if (code <= 3) return { label: "Mostly sunny", icon: "🌤" };
  if (code <= 48) return { label: "Foggy out there", icon: "🌫" };
  if (code <= 57) return { label: "Drizzle — plan carefully", icon: "🌦" };
  if (code <= 67) return { label: "Rain expected — reschedule if possible", icon: "🌧" };
  if (code <= 77) return { label: "Snow/hail expected", icon: "❄" };
  if (code <= 82) return { label: "Showers expected", icon: "🌦" };
  if (code <= 99) return { label: "Thunderstorms expected", icon: "⛈" };
  return { label: "Weather unknown", icon: "☁" };
}

export default function WorkerToday() {
  const router = useRouter();
  const toast = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [checklist, setChecklist] = useState({ loaded: false, route: false, contact: false });
  const [updatesMap, setUpdatesMap] = useState<Record<string, { arrived?: string; completed?: string }>>({});
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [noteType, setNoteType] = useState<Record<string, "note" | "issue">>({});
  const [photoCount, setPhotoCount] = useState<Record<string, number>>({});
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [listening, setListening] = useState<string | null>(null);
  const [routeOpen, setRouteOpen] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/worker/me");
    if (r.status === 401) { router.push("/worker/login"); return; }
    const data = await r.json();
    setBookings(Array.isArray(data) ? data : []);
    setLoading(false);

    const map: Record<string, { arrived?: string; completed?: string }> = {};
    const photos: Record<string, number> = {};
    await Promise.all((data || []).map(async (b: Booking) => {
      const r = await fetch(`/api/admin/bookings/${b.id}`);
      if (!r.ok) return;
      const d = await r.json();
      const arr = (d.job_updates || []).find((u: any) => u.type === "arrived");
      const com = (d.job_updates || []).find((u: any) => u.type === "completed");
      map[b.id] = { arrived: arr?.created_at, completed: com?.created_at };
      photos[b.id] = (d.job_photos || []).length;
    }));
    setUpdatesMap(map);
    setPhotoCount(photos);
  };

  useEffect(() => {
    load();
    // iOS install banner
    if (typeof window !== "undefined") {
      const isStandalone = (window.navigator as any).standalone === true;
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const dismissed = localStorage.getItem("install-dismissed");
      if (isIOS && !isStandalone && !dismissed) setShowInstall(true);
    }
    // Daily checklist
    const today = new Date().toLocaleDateString("en-CA");
    const key = `checklist-${today}`;
    if (!localStorage.getItem(key)) setShowChecklist(true);
    // Weather
    fetch("https://api.open-meteo.com/v1/forecast?latitude=-37.8&longitude=144.9&current=temperature_2m,weather_code&forecast_days=1&timezone=Australia/Sydney")
      .then(r => r.json())
      .then(d => { if (d?.current) setWeather({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code }); })
      .catch(() => {});
  }, []);

  const dismissChecklist = () => {
    const today = new Date().toLocaleDateString("en-CA");
    localStorage.setItem(`checklist-${today}`, "done");
    setShowChecklist(false);
  };

  const logout = async () => {
    await fetch("/api/worker/logout", { method: "POST" });
    router.push("/worker/login");
  };

  const postUpdate = async (bookingId: string, type: "arrived" | "completed" | "note" | "issue", note?: string) => {
    const res = await fetch("/api/worker/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, type, note }),
    });
    if (!res.ok) { toast("Couldn't save. Try again.", "error"); return; }
    if (type === "arrived") toast("Arrived on site");
    if (type === "note") toast("Note saved");
    if (type === "issue") toast("Issue flagged");
    if (type === "completed") {
      setSuccess(true);
      toast("Job completed ✓");
      setTimeout(() => { setSuccess(false); load(); }, 1800);
      return;
    }
    load();
  };

  const requestComplete = (bookingId: string) => {
    const count = photoCount[bookingId] || 0;
    if (count === 0) {
      if (!confirm("No photos yet — take a photo of the clean as proof of service? You can still complete without photos.")) {
        return;
      }
    }
    postUpdate(bookingId, "completed");
  };

  const submitNote = (bookingId: string) => {
    const text = noteInput[bookingId]?.trim();
    if (!text) return;
    const type = noteType[bookingId] || "note";
    postUpdate(bookingId, type, text);
    setNoteInput(p => ({ ...p, [bookingId]: "" }));
  };

  const uploadPhoto = async (bookingId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("booking_id", bookingId);
      fd.append("type", "after");
      await fetch("/api/worker/photos", { method: "POST", body: fd });
    }
    toast("Photo added");
    load();
  };

  const startVoice = (bookingId: string) => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast("Voice not supported on this device", "error"); return; }
    const r = new SR();
    r.lang = "en-AU"; r.continuous = false; r.interimResults = false;
    setListening(bookingId);
    r.onresult = (e: any) => {
      const t = e.results?.[0]?.[0]?.transcript || "";
      setNoteInput(p => ({ ...p, [bookingId]: ((p[bookingId] || "") + " " + t).trim() }));
    };
    r.onend = () => setListening(null);
    r.onerror = () => { setListening(null); toast("Voice input failed", "error"); };
    r.start();
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Sydney" });

  const completedToday = bookings.filter(b => b.status === "completed").length;
  const totalToday = bookings.length;
  const toGo = totalToday - completedToday;
  const progressPct = totalToday === 0 ? 0 : Math.round((completedToday / totalToday) * 100);
  const inProgressBooking = bookings.find(b => b.status === "in_progress");
  const firstUpcoming = bookings
    .filter(b => (b.status === "confirmed" || b.status === "pending") && new Date(b.scheduled_at) > today)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

  // Earnings so far today (arrived + completed counts as worked)
  const earnedToday = completedToday;

  const adminPhone = process.env.NEXT_PUBLIC_ADMIN_PHONE || "";

  if (success) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", animation: "fadeIn 0.3s ease-out" }}>
        <div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "rgba(74,222,128,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
          <CheckCircle size={48} color="#4ade80" strokeWidth={2.5} />
        </div>
        <h2 style={{ fontSize: "26px", fontWeight: 800, color: "#4ade80", marginBottom: "6px" }}>Job complete</h2>
        <p style={{ color: "#7A95B0", fontSize: "14px" }}>Nice work.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <SkeletonCard height={80} />
        <SkeletonCard height={160} />
        <SkeletonCard height={110} />
        <SkeletonCard height={110} />
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#7A95B0", fontSize: "13px" }}>
            <GreetingIcon />
            <span>{greeting()}</span>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em", marginTop: "4px" }}>{dateStr}</h1>
          <p style={{ fontSize: "12px", color: "#7A95B0", marginTop: "2px" }} className="tabular-nums">
            {totalToday === 0 ? "No jobs today" : `${totalToday} job${totalToday === 1 ? "" : "s"} · ${toGo} to go`}
          </p>
        </div>
        <button onClick={logout} aria-label="Log out" className="portal-btn" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#7A95B0", padding: "8px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LogOut size={16} />
        </button>
      </div>

      {/* Install banner */}
      {showInstall && (
        <Card style={{ marginBottom: "12px", background: "rgba(245,197,24,0.06)", border: "1px solid rgba(245,197,24,0.2)" }} padding="12px 14px">
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Smartphone size={18} color="#F5C518" />
            <div style={{ flex: 1, fontSize: "12px", color: "#EFF4FF", lineHeight: 1.4 }}>
              <strong>Install this app:</strong> tap the Share button, then <em>Add to Home Screen</em>.
            </div>
            <button onClick={() => { localStorage.setItem("install-dismissed", "1"); setShowInstall(false); }} style={{ background: "none", border: "none", color: "#7A95B0", cursor: "pointer", fontSize: "18px", padding: "2px 6px" }}>×</button>
          </div>
        </Card>
      )}

      {/* Weather strip */}
      {weather && totalToday > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", marginBottom: "12px", fontSize: "12px", color: "#7A95B0" }}>
          <span style={{ fontSize: "15px" }}>{weatherLabel(weather.code).icon}</span>
          <span><strong style={{ color: "#EFF4FF" }} className="tabular-nums">{weather.temp}°C</strong> · {weatherLabel(weather.code).label}</span>
        </div>
      )}

      {/* Progress bar */}
      {totalToday > 0 && (
        <Card padding="14px 16px" style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600 }} className="tabular-nums">{completedToday} of {totalToday} done</span>
            <span style={{ fontSize: "13px", fontWeight: 800, color: progressPct === 100 ? "#4ade80" : "#F5C518" }} className="tabular-nums">{progressPct}%</span>
          </div>
          <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ width: `${progressPct}%`, height: "100%", background: progressPct === 100 ? "#4ade80" : "#F5C518", borderRadius: "999px", transition: "width 0.3s ease-out" }} />
          </div>
        </Card>
      )}

      {/* Active job sticky banner */}
      {inProgressBooking && (
        <Card style={{ marginBottom: "14px", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.3)" }} padding="14px">
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <AlertCircle size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "11px", color: "#60a5fa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Currently at</p>
              <p style={{ fontSize: "15px", fontWeight: 700, marginTop: "2px" }}>{inProgressBooking.customers.name}</p>
              {updatesMap[inProgressBooking.id]?.arrived && (
                <p style={{ fontSize: "12px", color: "#7A95B0", marginTop: "2px" }}>Arrived {formatTime(updatesMap[inProgressBooking.id].arrived!)}</p>
              )}
            </div>
            <button onClick={() => requestComplete(inProgressBooking.id)} className="portal-btn" style={{ background: "#4ade80", color: "#08101C", border: "none", borderRadius: "8px", padding: "8px 14px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>Finish</button>
          </div>
        </Card>
      )}

      {/* First upcoming hero */}
      {firstUpcoming && !inProgressBooking && (() => {
        const mins = Math.round((new Date(firstUpcoming.scheduled_at).getTime() - today.getTime()) / 60000);
        const label = mins < 60 ? `In ${mins} min` : mins < 180 ? `In ${Math.round(mins / 60 * 10) / 10} hr` : `Later today at ${formatTime(firstUpcoming.scheduled_at)}`;
        return (
          <Card accent="#F5C518" padding="16px" style={{ marginBottom: "14px" }}>
            <p style={{ fontSize: "11px", color: "#F5C518", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Up Next</p>
            <p style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "-0.02em", marginTop: "4px" }}>{firstUpcoming.customers.name}</p>
            <p style={{ fontSize: "13px", color: "#7A95B0" }}>{firstUpcoming.customers.suburb} · {label}</p>
          </Card>
        );
      })()}

      {/* Today's route overview */}
      {bookings.length >= 3 && (
        <Card style={{ marginBottom: "14px" }} padding="0">
          <button
            onClick={() => setRouteOpen(o => !o)}
            aria-expanded={routeOpen}
            className="portal-btn"
            style={{ width: "100%", padding: "14px 16px", background: "transparent", border: "none", color: "#EFF4FF", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "inherit" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(245,197,24,0.08)", color: "#F5C518", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Route size={14} />
              </div>
              <div style={{ textAlign: "left" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Today's Route</p>
                <p style={{ fontSize: "11px", color: "#7A95B0", marginTop: "1px" }}>{bookings.length} stops</p>
              </div>
            </div>
            {routeOpen ? <ChevronUp size={18} color="#7A95B0" /> : <ChevronDown size={18} color="#7A95B0" />}
          </button>
          {routeOpen && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "10px 16px" }}>
              {bookings.map((b, i) => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", fontSize: "13px" }}>
                  <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(245,197,24,0.12)", color: "#F5C518", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontWeight: 600, color: "#F5C518" }} className="tabular-nums">{formatTime(b.scheduled_at)}</span>
                  <span style={{ color: "#EFF4FF" }}>{b.customers.suburb}</span>
                  <span style={{ color: "#7A95B0", marginLeft: "auto", fontSize: "11px" }}>{b.customers.name?.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Jobs list */}
      {totalToday === 0 ? (
        <div style={{ textAlign: "center", paddingTop: "60px" }}>
          <Sun size={40} color="#F5C518" style={{ marginBottom: "12px", opacity: 0.5 }} />
          <p style={{ color: "#EFF4FF", fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>No jobs scheduled for today</p>
          <p style={{ color: "#7A95B0", fontSize: "13px" }}>Enjoy the break ☀</p>
        </div>
      ) : completedToday === totalToday ? (
        <Card accent="#4ade80" padding="24px 20px" style={{ marginTop: "12px" }}>
          <div style={{ textAlign: "center" }}>
            <Sparkles size={32} color="#4ade80" style={{ marginBottom: "10px" }} />
            <p style={{ fontSize: "18px", fontWeight: 800, color: "#4ade80" }}>Nice work!</p>
            <p style={{ fontSize: "13px", color: "#EFF4FF", marginTop: "4px" }}>{completedToday} clean{completedToday === 1 ? "" : "s"} done today</p>
            <button onClick={logout} className="portal-btn" style={{ marginTop: "16px", padding: "10px 20px", background: "transparent", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              Log out for the day
            </button>
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {bookings.map((b, i) => {
            const c = b.customers;
            const isExpanded = expanded === b.id;
            const color = b.status === "completed" ? "#4ade80" : b.status === "in_progress" ? "#60a5fa" : "#F5C518";
            const upd = updatesMap[b.id] || {};
            const url = mapsUrl(c);
            return (
              <Card key={b.id} accent={color} padding="0">
                <div onClick={() => setExpanded(isExpanded ? null : b.id)} style={{ padding: "14px 16px", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "15px", fontWeight: 700, color }} className="tabular-nums">{formatTime(b.scheduled_at)}</span>
                        <span style={{ fontSize: "11px", color: "#7A95B0", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "999px", fontWeight: 600 }}>Stop {i + 1}</span>
                        {b.status === "completed" && <Badge tone="completed" label="Done" icon={<CheckCircle size={10} />} />}
                        {b.status === "in_progress" && <Badge tone="in_progress" label="On site" icon={<Clock size={10} />} />}
                      </div>
                      <p style={{ fontSize: "17px", fontWeight: 700, marginBottom: "2px" }}>{c.name}</p>
                      <p style={{ fontSize: "13px", color: "#7A95B0" }}>{c.street}, {c.suburb}</p>
                      <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "999px", color: "#7A95B0" }}>{c.panels} panels</span>
                        <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "999px", color: "#7A95B0" }}>{c.stories}</span>
                        <span style={{ fontSize: "11px", background: "rgba(245,197,24,0.1)", padding: "2px 8px", borderRadius: "999px", color: "#F5C518" }}>{planLabel[c.plan] || c.plan}</span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} color="#7A95B0" /> : <ChevronDown size={16} color="#7A95B0" />}
                  </div>

                  {/* Always-visible quick actions */}
                  <div style={{ display: "flex", gap: "6px", marginTop: "12px" }} onClick={e => e.stopPropagation()}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="portal-btn" style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", background: "rgba(245,197,24,0.08)", color: "#F5C518", border: "1px solid rgba(245,197,24,0.2)", borderRadius: "8px", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>
                      <MapPin size={12} /> Directions
                    </a>
                    <a href={`tel:${c.phone}`} className="portal-btn" style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", background: "rgba(255,255,255,0.04)", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "12px", fontWeight: 600, textDecoration: "none" }}>
                      <Phone size={12} /> Call
                    </a>
                    <button onClick={e => { e.stopPropagation(); fileInputRefs.current[b.id]?.click(); }} className="portal-btn" style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", background: "rgba(255,255,255,0.04)", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                      <Camera size={12} /> Photos{photoCount[b.id] ? ` (${photoCount[b.id]})` : ""}
                    </button>
                  </div>
                </div>

                <input
                  ref={el => { fileInputRefs.current[b.id] = el; }}
                  type="file" accept="image/*" capture="environment" multiple
                  style={{ display: "none" }}
                  onChange={e => uploadPhoto(b.id, e.target.files)}
                />

                {isExpanded && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {c.notes && (
                      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px 14px" }}>
                        <p style={{ fontSize: "11px", color: "#7A95B0", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Customer Notes</p>
                        <p style={{ fontSize: "14px", lineHeight: 1.5 }}>{c.notes}</p>
                      </div>
                    )}

                    {/* Status action */}
                    {(b.status === "confirmed" || b.status === "pending") && (
                      <button onClick={() => postUpdate(b.id, "arrived")} className="portal-btn" style={{ width: "100%", padding: "14px", background: "#F5C518", color: "#08101C", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "15px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        Arrived on site <ArrowRight size={16} />
                      </button>
                    )}
                    {b.status === "in_progress" && (
                      <>
                        {upd.arrived && <p style={{ fontSize: "12px", color: "#60a5fa", textAlign: "center" }}>Arrived {formatTime(upd.arrived)}</p>}
                        {photoCount[b.id] === 0 && (
                          <div style={{ background: "rgba(245,197,24,0.06)", border: "1px solid rgba(245,197,24,0.2)", borderRadius: "10px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px" }}>
                            <Camera size={16} color="#F5C518" />
                            <span style={{ fontSize: "12px", color: "#EFF4FF", flex: 1 }}>Take a photo as proof of service</span>
                            <button onClick={() => fileInputRefs.current[b.id]?.click()} className="portal-btn" style={{ background: "rgba(245,197,24,0.15)", color: "#F5C518", border: "none", borderRadius: "6px", padding: "6px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>Photo</button>
                          </div>
                        )}
                        <button onClick={() => requestComplete(b.id)} className="portal-btn" style={{ width: "100%", padding: "14px", background: "#4ade80", color: "#08101C", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "15px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                          Finish this job <CheckCircle size={16} />
                        </button>
                      </>
                    )}
                    {b.status === "completed" && upd.completed && (
                      <div style={{ textAlign: "center", padding: "12px", background: "rgba(74,222,128,0.08)", borderRadius: "10px" }}>
                        <p style={{ fontSize: "14px", color: "#4ade80", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <CheckCircle size={14} /> Completed {formatTime(upd.completed)}
                        </p>
                      </div>
                    )}

                    {/* Note / issue */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {(["note", "issue"] as const).map(t => (
                          <button key={t} onClick={() => setNoteType(p => ({ ...p, [b.id]: t }))} className="portal-btn" style={{
                            flex: 1, padding: "8px",
                            background: (noteType[b.id] || "note") === t ? (t === "issue" ? "rgba(248,113,113,0.15)" : "rgba(245,197,24,0.15)") : "rgba(255,255,255,0.04)",
                            color: (noteType[b.id] || "note") === t ? (t === "issue" ? "#f87171" : "#F5C518") : "#7A95B0",
                            border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
                            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px",
                          }}>
                            {t === "issue" ? <><Flag size={11} /> Flag Issue</> : <><StickyNote size={11} /> Note</>}
                          </button>
                        ))}
                      </div>
                      <div style={{ position: "relative" }}>
                        <textarea
                          value={noteInput[b.id] || ""}
                          onChange={e => setNoteInput(p => ({ ...p, [b.id]: e.target.value }))}
                          placeholder={listening === b.id ? "Listening…" : "Add a note or flag an issue…"}
                          rows={2}
                          style={{ width: "100%", padding: "10px 38px 10px 12px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "13px", resize: "vertical", fontFamily: "inherit" }}
                        />
                        <button onClick={() => startVoice(b.id)} aria-label="Voice input" className="portal-btn" style={{ position: "absolute", right: "8px", top: "8px", background: listening === b.id ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.04)", color: listening === b.id ? "#f87171" : "#7A95B0", border: "none", borderRadius: "6px", padding: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Mic size={14} />
                        </button>
                      </div>
                      <button onClick={() => submitNote(b.id)} disabled={!noteInput[b.id]?.trim()} className="portal-btn" style={{ padding: "10px", background: noteInput[b.id]?.trim() ? "rgba(245,197,24,0.2)" : "rgba(255,255,255,0.04)", color: noteInput[b.id]?.trim() ? "#F5C518" : "#7A95B0", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                        Submit
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Emergency contact */}
      {adminPhone && (
        <a href={`tel:${adminPhone}`} className="portal-btn" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "20px", width: "100%", padding: "12px", background: "transparent", color: "#7A95B0", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
          <PhoneCall size={13} /> Need help? Call admin
        </a>
      )}

      {/* Daily checklist modal */}
      {showChecklist && totalToday > 0 && (
        <div onClick={dismissChecklist} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", animation: "fadeIn 0.2s ease-out" }}>
          <div onClick={e => e.stopPropagation()} className="portal-pop-in" style={{ background: "#0F1E30", border: "1px solid rgba(245,197,24,0.25)", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "380px" }}>
            <p style={{ fontSize: "11px", color: "#F5C518", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Before you start</p>
            <h3 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "14px" }}>Quick checklist</h3>
            {([
              ["loaded", "Vehicle loaded (water, ladder, gear)"],
              ["route", "Today's route checked"],
              ["contact", "First customer's phone saved"],
            ] as const).map(([key, label]) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", background: "#08101C", borderRadius: "8px", marginBottom: "6px", cursor: "pointer" }}>
                <input type="checkbox" checked={checklist[key]} onChange={e => setChecklist(c => ({ ...c, [key]: e.target.checked }))} style={{ width: "18px", height: "18px", accentColor: "#F5C518" }} />
                <span style={{ fontSize: "14px", textDecoration: checklist[key] ? "line-through" : "none", color: checklist[key] ? "#7A95B0" : "#EFF4FF" }}>{label}</span>
              </label>
            ))}
            <button onClick={dismissChecklist} className="portal-btn" style={{ width: "100%", marginTop: "12px", padding: "12px", background: "#F5C518", color: "#08101C", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>Let's go</button>
          </div>
        </div>
      )}
    </div>
  );
}
