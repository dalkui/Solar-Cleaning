import { supabase } from "./supabase";

function formatAuPhone(phone: string): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("+61")) return cleaned;
  if (cleaned.startsWith("61")) return "+" + cleaned;
  if (cleaned.startsWith("04") && cleaned.length === 10) return "+61" + cleaned.slice(1);
  if (cleaned.startsWith("4") && cleaned.length === 9) return "+61" + cleaned;
  return null;
}

export async function sendSMS(to: string, body: string, opts?: { customerId?: string; purpose?: string }): Promise<void> {
  const e164 = formatAuPhone(to);
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!e164) {
    console.warn("[sms] invalid phone:", to);
    return;
  }
  if (!sid || !authToken || !fromNumber) {
    console.warn("[sms] Twilio not configured, would have sent:", e164, body);
    return;
  }

  try {
    const form = new URLSearchParams();
    form.append("To", e164);
    form.append("From", fromNumber);
    form.append("Body", body);

    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${sid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    if (opts?.customerId) {
      await supabase.from("customer_messages").insert({
        customer_id: opts.customerId,
        direction: "outbound",
        channel: "sms",
        body,
        purpose: opts.purpose || "general",
      });
    }
  } catch (err) {
    console.error("[sms] send failed:", err);
  }
}

export { formatAuPhone };
