"use client";
import { useEffect, useState } from "react";

interface Booking {
  id: string; scheduled_at: string; status: string;
  workers?: { id: string; name: string } | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" });
}

export default function PortalHistory() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [photos, setPhotos] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/me")
      .then(r => r.json())
      .then(async d => {
        const completed = (d.bookings || []).filter((b: Booking) => b.status === "completed");
        setBookings(completed);
        // Fetch photos for each completed booking
        const photoMap: Record<string, any[]> = {};
        await Promise.all(completed.map(async (b: Booking) => {
          const r = await fetch(`/api/portal/photos?booking_id=${b.id}`);
          if (r.ok) photoMap[b.id] = (await r.json()).photos || [];
        }));
        setPhotos(photoMap);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: "24px 20px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "4px" }}>History</h1>
      <p style={{ fontSize: "13px", color: "#7A95B0", marginBottom: "20px" }}>Your past cleans</p>

      {loading ? (
        <p style={{ color: "#7A95B0", textAlign: "center", padding: "40px 0" }}>Loading…</p>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ fontSize: "40px", marginBottom: "8px" }}>☀️</p>
          <p style={{ color: "#7A95B0" }}>No past cleans yet</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {bookings.map(b => {
            const bookingPhotos = photos[b.id] || [];
            return (
              <div key={b.id} style={{ background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid #4ade80", borderRadius: "10px", padding: "14px 16px" }}>
                <p style={{ fontSize: "14px", fontWeight: 700, marginBottom: "2px" }}>{formatDate(b.scheduled_at)}</p>
                <p style={{ fontSize: "12px", color: "#7A95B0", marginBottom: bookingPhotos.length ? "10px" : 0 }}>
                  {b.workers ? `Cleaned by ${b.workers.name}` : "Completed"}
                </p>
                {bookingPhotos.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                    {bookingPhotos.map((p: any) => (
                      <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                        <img src={p.url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "6px" }} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
