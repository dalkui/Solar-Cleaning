import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyCustomerToken } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("customer_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyCustomerToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const update: Record<string, any> = {};
  const allowed = ["auto_schedule", "preferred_time_of_day", "phone", "street", "suburb", "state", "postcode", "sms_opt_out"];
  for (const k of allowed) {
    if (body[k] !== undefined) update[k] = body[k];
  }

  const { error } = await supabase.from("customers").update(update).eq("id", session.customerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
