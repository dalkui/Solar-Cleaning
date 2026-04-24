"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
const statusColor: Record<string, string> = {
  confirmed: "#F5C518",
  pending: "#F5C518",
  in_progress: "#60a5fa",
  completed: "#4ade80",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Australia/Sydney" });
}

function greetingName() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function WorkerToday() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [success, setSuccess] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [updatesMap, setUpdatesMap] = useState<Record<string, { arrived?: string; completed?: string }>>({});
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [noteType, setNoteType] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/worker/me");
    if (r.status === 401) { router.push("/worker/login"); return; }
    const data = await r.json();
    setBookings(Array.isArray(data) ? data : []);
    setLoading(false);

    // Pull updates for each booking to show arrived/completed times
    const map: Record<string, { arrived?: string; completed?: string }> = {};
    await Promise.all((data || []).map(async (b: Booking) => {
      if (b.status === "in_progress" || b.status === "completed") {
        const r = await fetch(`/api/admin/bookings/${b.id}`);
        const d = await r.json();
        const arr = (d.job_updates || []).find((u: any) => u.type === "arrived");
        const com = (d.job_updates || []).find((u: any) => u.type === "completed");
        map[b.id] = { arrived: arr?.created_at, completed: com?.created_at };
      }
    }));
    setUpdatesMap(map);
  };

  useEffect(() => {
    load();
    // Check iOS standalone
    if (typeof window !== "undefined") {
      const isStandalone = (window.navigator as any).standalone === true;
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const dismissed = localStorage.getItem("install-dismissed");
      if (isIOS && !isStandalone && !dismissed) setShowInstall(true);
    }
    // Get name from cookie via meta — but cookie is httpOnly, use /api/worker/me response header
    fetch("/api/worker/me").then(r => r.ok && setName(r.headers.get("x-worker-name") || "")).catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/worker/logout", { method: "POST" });
    router.push("/worker/login");
  };

  const postUpdate = async (bookingId: string, type: string, note?: string) => {
    await fetch("/api/worker/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, type, note }),
    });
    if (type === "completed") {
      setSuccess(true);
      setTimeout(() => { setSuccess(false); load(); }, 2000);
    } else {
      load();
    }
  };

  const submitNote = async (bookingId: string) => {
    const text = noteInput[bookingId]?.trim();
    if (!text) return;
    const type = noteType[bookingId] || "note";
    await postUpdate(bookingId, type, text);
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
    load();
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Sydney" });

  if (success) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(74,222,128,0.1)" }}>
        <div style={{ fontSize: "80px", marginBottom: "20px" }}>✅</div>
        <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#4ade80", marginBottom: "8px" }}>Job Complete!</h2>
        <p style={{ color: "#7A95B0", fontSize: "15px" }}>Nice work.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "20px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: "14px", color: "#7A95B0" }}>{greetingName()}</p>
          <h1 style={{ fontSize: "22px", fontWeight: 800, marginTop: "2px" }}>{dateStr}</h1>
        </div>
        <button onClick={logout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#7A95B0", padding: "8px 12px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>
          Sign Out
        </button>
      </div>

      {/* Install banner */}
      {showInstall && (
        <div style={{ margin: "0 20px 12px", padding: "12px 14px", background: "rgba(245,197,24,0.08)", border: "1px solid rgba(245,197,24,0.2)", borderRadius: "10px", display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ fontSize: "20px" }}>📱</div>
          <div style={{ flex: 1, fontSize: "12px", color: "#EFF4FF", lineHeight: 1.4 }}>
            <strong>Install this app:</strong> tap the Share button, then <em>Add to Home Screen</em>.
          </div>
          <button onClick={() => { localStorage.setItem("install-dismissed", "1"); setShowInstall(false); }} style={{ background: "none", border: "none", color: "#7A95B0", cursor: "pointer", fontSize: "18px" }}>×</button>
        </div>
      )}

      {/* Jobs */}
      <div style={{ padding: "8px 16px 20px" }}>
        {loading ? (
          <p style={{ color: "#7A95B0", textAlign: "center", paddingTop: "60px" }}>Loading…</p>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: "80px" }}>
            <div style={{ fontSize: "54px", marginBottom: "12px" }}>🌞</div>
            <p style={{ color: "#EFF4FF", fontSize: "17px", fontWeight: 600, marginBottom: "4px" }}>No jobs today</p>
            <p style={{ color: "#7A95B0", fontSize: "14px" }}>Enjoy your day!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {bookings.map((b, i) => {
              const c = b.customers;
              const isExpanded = expanded === b.id;
              const color = statusColor[b.status] || "#F5C518";
              const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(`${c.street}, ${c.suburb} ${c.postcode} ${c.state}`)}`;
              const upd = updatesMap[b.id] || {};
              return (
                <div key={b.id} style={{ background: "#0F1E30", border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, borderRadius: "12px", overflow: "hidden" }}>
                  <div onClick={() => setExpanded(isExpanded ? null : b.id)} style={{ padding: "14px 16px", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "16px", fontWeight: 700, color }}>{formatTime(b.scheduled_at)}</span>
                          <span style={{ fontSize: "11px", color: "#7A95B0", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "999px" }}>Job {i + 1}</span>
                          {b.status === "completed" && <span style={{ fontSize: "11px", color: "#4ade80" }}>✓ Done</span>}
                          {b.status === "in_progress" && <span style={{ fontSize: "11px", color: "#60a5fa" }}>In progress</span>}
                        </div>
                        <p style={{ fontSize: "17px", fontWeight: 700, marginBottom: "2px" }}>{c.name}</p>
                        <p style={{ fontSize: "13px", color: "#7A95B0" }}>{c.street}, {c.suburb}</p>
                        <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "999px", color: "#7A95B0" }}>{c.panels} panels</span>
                          <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "999px", color: "#7A95B0" }}>{c.stories}</span>
                          <span style={{ fontSize: "11px", background: "rgba(245,197,24,0.1)", padding: "2px 8px", borderRadius: "999px", color: "#F5C518" }}>{planLabel[c.plan] || c.plan}</span>
                        </div>
                      </div>
                      <span style={{ color: "#7A95B0", fontSize: "16px", marginLeft: "10px" }}>{isExpanded ? "↑" : "↓"}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(245,197,24,0.08)", border: "1px solid rgba(245,197,24,0.2)", borderRadius: "10px", padding: "12px 14px", textDecoration: "none", color: "#F5C518" }}>
                        <span style={{ fontSize: "18px" }}>📍</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: "14px", fontWeight: 600 }}>{c.street}</p>
                          <p style={{ fontSize: "12px", opacity: 0.8 }}>{c.suburb} {c.postcode}, {c.state}</p>
                        </div>
                        <span style={{ fontSize: "14px" }}>→</span>
                      </a>

                      <a href={`tel:${c.phone}`} style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px 14px", textDecoration: "none", color: "#EFF4FF" }}>
                        <span style={{ fontSize: "18px" }}>📞</span>
                        <span style={{ fontSize: "14px" }}>{c.phone}</span>
                      </a>

                      {c.notes && (
                        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px 14px" }}>
                          <p style={{ fontSize: "11px", color: "#7A95B0", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Customer Notes</p>
                          <p style={{ fontSize: "14px", lineHeight: 1.5 }}>{c.notes}</p>
                        </div>
                      )}

                      {/* Status action */}
                      {(b.status === "confirmed" || b.status === "pending") && (
                        <button onClick={() => postUpdate(b.id, "arrived")} style={{ width: "100%", padding: "14px", background: "#F5C518", color: "#08101C", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}>
                          I've Arrived
                        </button>
                      )}
                      {b.status === "in_progress" && (
                        <>
                          {upd.arrived && (
                            <p style={{ fontSize: "12px", color: "#60a5fa", textAlign: "center" }}>Arrived at {formatTime(upd.arrived)}</p>
                          )}
                          <button onClick={() => postUpdate(b.id, "completed")} style={{ width: "100%", padding: "14px", background: "#4ade80", color: "#08101C", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}>
                            Mark Complete
                          </button>
                        </>
                      )}
                      {b.status === "completed" && upd.completed && (
                        <div style={{ textAlign: "center", padding: "12px", background: "rgba(74,222,128,0.08)", borderRadius: "10px" }}>
                          <p style={{ fontSize: "14px", color: "#4ade80", fontWeight: 600 }}>✓ Completed at {formatTime(upd.completed)}</p>
                        </div>
                      )}

                      {/* Photo upload */}
                      <input
                        ref={el => { fileInputRefs.current[b.id] = el; }}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        style={{ display: "none" }}
                        onChange={e => uploadPhoto(b.id, e.target.files)}
                      />
                      <button onClick={() => fileInputRefs.current[b.id]?.click()} style={{ width: "100%", padding: "12px", background: "rgba(255,255,255,0.04)", color: "#EFF4FF", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: "10px", fontSize: "14px", cursor: "pointer" }}>
                        📷 Add Photos
                      </button>

                      {/* Note / issue */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {["note","issue"].map(t => (
                            <button key={t} onClick={() => setNoteType(p => ({ ...p, [b.id]: t }))} style={{
                              flex: 1,
                              padding: "8px",
                              background: (noteType[b.id] || "note") === t ? (t === "issue" ? "rgba(248,113,113,0.15)" : "rgba(245,197,24,0.15)") : "rgba(255,255,255,0.04)",
                              color: (noteType[b.id] || "note") === t ? (t === "issue" ? "#f87171" : "#F5C518") : "#7A95B0",
                              border: "none",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              textTransform: "capitalize",
                            }}>{t === "issue" ? "🚩 Flag Issue" : "📝 Note"}</button>
                          ))}
                        </div>
                        <textarea
                          value={noteInput[b.id] || ""}
                          onChange={e => setNoteInput(p => ({ ...p, [b.id]: e.target.value }))}
                          placeholder="Add a note or flag an issue…"
                          rows={2}
                          style={{ width: "100%", padding: "10px 12px", background: "#08101C", color: "#EFF4FF", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "13px", resize: "vertical", fontFamily: "inherit" }}
                        />
                        <button onClick={() => submitNote(b.id)} disabled={!noteInput[b.id]?.trim()} style={{ padding: "10px", background: noteInput[b.id]?.trim() ? "rgba(245,197,24,0.2)" : "rgba(255,255,255,0.04)", color: noteInput[b.id]?.trim() ? "#F5C518" : "#7A95B0", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                          Submit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
