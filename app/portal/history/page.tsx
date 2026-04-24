"use client";
import { useEffect, useState } from "react";
import { Sparkles, Calendar, Camera, X as XIcon, Clock } from "lucide-react";
import { Card } from "@/components/portal/Card";
import { Badge } from "@/components/portal/Badge";
import { SectionHeader } from "@/components/portal/SectionHeader";
import { SkeletonCard } from "@/components/portal/Skeleton";
import { WorkerAvatar } from "@/components/portal/WorkerAvatar";
import { getUpcomingProjections } from "@/lib/clean-dates";

interface Booking {
  id: string; scheduled_at: string; status: string; due_month?: string | null;
  workers?: { id: string; name: string; color: string } | null;
  job_updates?: any[]; job_photos?: any[];
}
interface Customer { plan: string; subscribed_at: string; }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" });
}

export default function PortalHistory() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [completed, setCompleted] = useState<Booking[]>([]);
  const [photosMap, setPhotosMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/portal/me").then(r => r.json());
      setCustomer(meRes.customer);
      setAllBookings(meRes.bookings || []);
      const done = (meRes.bookings || []).filter((b: Booking) => b.status === "completed");
      setCompleted(done);

      const photos: Record<string, any[]> = {};
      await Promise.all(done.map(async (b: Booking) => {
        const r = await fetch(`/api/portal/photos?booking_id=${b.id}`);
        if (r.ok) photos[b.id] = (await r.json()).photos || [];
      }));
      setPhotosMap(photos);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <SkeletonCard height={80} />
        <SkeletonCard height={120} />
        <SkeletonCard height={140} />
      </div>
    );
  }

  const totalPhotos = Object.values(photosMap).reduce((s, arr) => s + arr.length, 0);
  const projections = customer ? getUpcomingProjections({ plan: customer.plan, subscribed_at: customer.subscribed_at }, allBookings, 3) : [];
  const memberSince = customer ? new Date(customer.subscribed_at).toLocaleDateString("en-AU", { month: "short", year: "numeric" }) : "";

  return (
    <div style={{ padding: "24px 20px" }}>
      <div style={{ marginBottom: "18px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: 800, letterSpacing: "-0.02em" }}>History</h1>
        <p style={{ fontSize: "13px", color: "#7A95B0", marginTop: "2px" }}>Your past and upcoming cleans</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "20px" }}>
        <Card padding="14px">
          <Sparkles size={16} color="#F5C518" style={{ marginBottom: "6px" }} />
          <p style={{ fontSize: "22px", fontWeight: 800 }} className="tabular-nums">{completed.length}</p>
          <p style={{ fontSize: "11px", color: "#7A95B0", marginTop: "2px" }}>{completed.length === 1 ? "clean" : "cleans"}</p>
        </Card>
        <Card padding="14px">
          <Camera size={16} color="#F5C518" style={{ marginBottom: "6px" }} />
          <p style={{ fontSize: "22px", fontWeight: 800 }} className="tabular-nums">{totalPhotos}</p>
          <p style={{ fontSize: "11px", color: "#7A95B0", marginTop: "2px" }}>{totalPhotos === 1 ? "photo" : "photos"}</p>
        </Card>
        <Card padding="14px">
          <Calendar size={16} color="#F5C518" style={{ marginBottom: "6px" }} />
          <p style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px" }}>Since</p>
          <p style={{ fontSize: "12px", color: "#7A95B0" }}>{memberSince}</p>
        </Card>
      </div>

      {/* Upcoming projections */}
      {projections.length > 0 && (
        <section style={{ marginBottom: "22px" }}>
          <SectionHeader>Next Few Cleans</SectionHeader>
          <Card padding="4px 0">
            {projections.map((p, i) => (
              <div key={i} style={{ padding: "12px 18px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#EFF4FF" }}>
                    {p.date.toLocaleDateString("en-AU", p.source === "scheduled" ? { weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Sydney" } : { month: "long", year: "numeric", timeZone: "Australia/Sydney" })}
                  </p>
                  {p.source === "scheduled" && (
                    <p style={{ fontSize: "12px", color: "#F5C518", marginTop: "2px" }}>
                      {p.date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Australia/Sydney" })}
                    </p>
                  )}
                </div>
                <Badge
                  tone={p.source === "scheduled" ? "scheduled" : p.source === "pending" ? "pending" : "projected"}
                  label={p.source === "scheduled" ? "Booked" : p.source === "pending" ? "Pending" : "Projected"}
                />
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* Past cleans */}
      <section>
        <SectionHeader>Past Cleans</SectionHeader>
        {completed.length === 0 ? (
          <Card padding="40px 20px">
            <div style={{ textAlign: "center" }}>
              <Sparkles size={40} color="#F5C518" style={{ marginBottom: "12px", opacity: 0.5 }} />
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#EFF4FF" }}>Your first clean is coming up</p>
              <p style={{ fontSize: "13px", color: "#7A95B0", marginTop: "4px", lineHeight: 1.5 }}>Once it's done, you'll see it here with photos from your worker.</p>
            </div>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {completed.map(b => {
              const photos = photosMap[b.id] || [];
              const arr = (b.job_updates || []).find((u: any) => u.type === "arrived");
              const com = (b.job_updates || []).find((u: any) => u.type === "completed");
              const duration = arr && com
                ? Math.round((new Date(com.created_at).getTime() - new Date(arr.created_at).getTime()) / 60000)
                : null;
              const workerColor = b.workers?.color || "#4ade80";
              return (
                <Card key={b.id} accent={workerColor}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: photos.length ? "12px" : 0 }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      {b.workers && <WorkerAvatar name={b.workers.name} color={b.workers.color} size={32} />}
                      <div>
                        <p style={{ fontSize: "14px", fontWeight: 700 }}>{formatDate(b.scheduled_at)}</p>
                        <p style={{ fontSize: "12px", color: "#7A95B0", marginTop: "2px", display: "flex", alignItems: "center", gap: "10px" }}>
                          {b.workers ? <span>By {b.workers.name}</span> : <span>Completed</span>}
                          {duration !== null && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                              <Clock size={11} /> {duration} min
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Badge tone="completed" label="Done" />
                  </div>
                  {photos.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                      {photos.map((p: any) => (
                        <button key={p.id} onClick={() => setLightbox(p.url)} aria-label="View photo" style={{ padding: 0, border: "none", background: "transparent", cursor: "pointer" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "8px", display: "block" }} />
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Photo lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", animation: "fadeIn 0.15s ease-out" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: "8px" }} />
          <button onClick={() => setLightbox(null)} aria-label="Close" style={{ position: "absolute", top: "calc(20px + env(safe-area-inset-top))", right: "20px", width: "40px", height: "40px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)", color: "#EFF4FF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <XIcon size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
