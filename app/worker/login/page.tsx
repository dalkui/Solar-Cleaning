"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Worker { id: string; name: string; color: string; }

export default function WorkerLogin() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/worker/list").then(r => r.json()).then(d => setWorkers(Array.isArray(d) ? d : []));
  }, []);

  const tapKey = (k: string) => {
    setError("");
    if (k === "del") { setPin(p => p.slice(0, -1)); return; }
    if (pin.length >= 4) return;
    setPin(p => p + k);
  };

  const submit = async () => {
    if (!selected || pin.length !== 4 || loading) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/worker/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: selected, pin }),
    });
    if (res.ok) {
      router.push("/worker");
    } else {
      setError("Wrong PIN or worker not found");
      setPin("");
      setLoading(false);
    }
  };

  const keys = ["1","2","3","4","5","6","7","8","9","del","0","enter"];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#F5C518", marginBottom: "4px", letterSpacing: "-0.02em" }}>FluroSolar</h1>
        <p style={{ fontSize: "14px", color: "#7A95B0" }}>Worker Portal</p>
      </div>

      <div style={{ width: "100%", maxWidth: "340px", background: "#0F1E30", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "24px" }}>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
          Who are you?
        </label>
        <select
          value={selected}
          onChange={e => { setSelected(e.target.value); setPin(""); setError(""); }}
          style={{
            width: "100%",
            padding: "14px",
            fontSize: "16px",
            background: "#08101C",
            color: "#EFF4FF",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            marginBottom: "20px",
            appearance: "none",
          }}
        >
          <option value="">Select your name</option>
          {workers.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
        </select>

        <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#7A95B0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
          Enter PIN
        </label>

        {/* PIN dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "14px", marginBottom: "20px" }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: pin.length > i ? "#F5C518" : "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
              transition: "all 0.15s",
            }} />
          ))}
        </div>

        {error && (
          <p style={{ color: "#f87171", fontSize: "13px", textAlign: "center", marginBottom: "14px" }}>{error}</p>
        )}

        {/* PIN pad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {keys.map(k => {
            if (k === "enter") {
              return (
                <button
                  key="enter"
                  onClick={submit}
                  disabled={!selected || pin.length !== 4 || loading}
                  style={{
                    padding: "16px 0",
                    fontSize: "16px",
                    fontWeight: 700,
                    background: selected && pin.length === 4 ? "#F5C518" : "rgba(245,197,24,0.2)",
                    color: selected && pin.length === 4 ? "#08101C" : "#7A95B0",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "all 0.1s",
                  }}
                >{loading ? "…" : "→"}</button>
              );
            }
            if (k === "del") {
              return (
                <button
                  key="del"
                  onClick={() => tapKey("del")}
                  style={{
                    padding: "16px 0",
                    fontSize: "16px",
                    background: "rgba(255,255,255,0.04)",
                    color: "#7A95B0",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >⌫</button>
              );
            }
            return (
              <button
                key={k}
                onClick={() => tapKey(k)}
                style={{
                  padding: "16px 0",
                  fontSize: "20px",
                  fontWeight: 600,
                  background: "rgba(255,255,255,0.04)",
                  color: "#EFF4FF",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
              >{k}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
