"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatTime } from "@/lib/slots";

interface SlotData {
  customer: { name: string; email: string; address: string };
  availableDates: Record<string, string[]>;
}

function ConfirmInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [data, setData] = useState<SlotData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    fetch(`/api/book/slots?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;
    setSubmitting(true);
    const scheduledAt = `${selectedDate}T${selectedTime}:00+10:00`;
    const res = await fetch("/api/book/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, scheduledAt }),
    });
    const result = await res.json();
    if (result.ok) setConfirmed(true);
    else setError(result.error || "Something went wrong.");
    setSubmitting(false);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg)" }}>
      <p style={{ color: "var(--text-muted)" }}>Loading…</p>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ maxWidth: "440px", textAlign: "center" }}>
        <p style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</p>
        <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "12px" }}>This link is no longer valid</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "15px", lineHeight: 1.7, marginBottom: "24px" }}>{error}. Please contact FluroSolar to get a new booking link.</p>
        <a href="mailto:fluroservices@gmail.com" className="btn btn-gold">Contact FluroSolar</a>
      </div>
    </div>
  );

  if (confirmed) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ maxWidth: "440px", textAlign: "center" }}>
        <p style={{ fontSize: "48px", marginBottom: "16px" }}>✓</p>
        <h2 className="display" style={{ fontSize: "28px", marginBottom: "12px" }}>You're booked in!</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "15px", lineHeight: 1.7 }}>
          We've sent a confirmation to <strong>{data?.customer.email}</strong>.<br />
          We'll send a reminder the day before your clean.
        </p>
      </div>
    </div>
  );

  const availableDateKeys = data ? Object.keys(data.availableDates).sort() : [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 20px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <span className="label" style={{ display: "block", marginBottom: "8px" }}>FluroSolar Cleaning</span>
          <h1 className="display" style={{ fontSize: "32px", marginBottom: "8px" }}>Book Your Clean</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Hi {data?.customer.name}, choose a date and time that works for you.</p>
        </div>

        {/* Date picker */}
        <div style={{ marginBottom: "24px" }}>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Select a Date</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
            {availableDateKeys.map((dateStr) => {
              const d = new Date(dateStr + "T00:00:00");
              const isSelected = selectedDate === dateStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => { setSelectedDate(dateStr); setSelectedTime(""); }}
                  style={{
                    background: isSelected ? "rgba(245,197,24,0.15)" : "var(--bg-card)",
                    border: `1px solid ${isSelected ? "rgba(245,197,24,0.5)" : "var(--border)"}`,
                    borderRadius: "10px",
                    padding: "12px 8px",
                    cursor: "pointer",
                    textAlign: "center",
                    color: "var(--text)",
                  }}
                >
                  <p style={{ fontSize: "11px", color: isSelected ? "var(--gold)" : "var(--text-muted)", marginBottom: "4px" }}>
                    {d.toLocaleDateString("en-AU", { weekday: "short" })}
                  </p>
                  <p style={{ fontSize: "16px", fontWeight: 700, color: isSelected ? "var(--gold)" : "var(--text)" }}>
                    {d.getDate()}
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {d.toLocaleDateString("en-AU", { month: "short" })}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        {selectedDate && data?.availableDates[selectedDate] && (
          <div style={{ marginBottom: "24px" }}>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Select a Time</p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {data.availableDates[selectedDate].map((time) => {
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    style={{
                      background: isSelected ? "rgba(245,197,24,0.15)" : "var(--bg-card)",
                      border: `1px solid ${isSelected ? "rgba(245,197,24,0.5)" : "var(--border)"}`,
                      borderRadius: "8px",
                      padding: "12px 20px",
                      cursor: "pointer",
                      color: isSelected ? "var(--gold)" : "var(--text)",
                      fontWeight: isSelected ? 700 : 400,
                      fontSize: "15px",
                    }}
                  >
                    {formatTime(time)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary + confirm */}
        {selectedDate && selectedTime && (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "4px" }}>Your booking</p>
            <p style={{ fontWeight: 700, fontSize: "16px" }}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })} at {formatTime(selectedTime)}
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{data?.customer.address}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!selectedDate || !selectedTime || submitting}
          className="btn btn-gold"
          style={{ width: "100%", opacity: (!selectedDate || !selectedTime || submitting) ? 0.5 : 1, cursor: (!selectedDate || !selectedTime) ? "not-allowed" : "pointer" }}
        >
          {submitting ? "Confirming…" : "Confirm Booking →"}
        </button>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return <Suspense><ConfirmInner /></Suspense>;
}
