import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getNextCleanDates } from "@/lib/clean-dates";

export async function GET() {
  const { data: customers, error } = await supabase
    .from("customers")
    .select("*")
    .eq("status", "active");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const jobs = (customers || []).flatMap((c) => {
    const nextDates = getNextCleanDates(new Date(c.subscribed_at), c.plan, 2);
    return nextDates.map((date) => ({
      customerId: c.id,
      customerName: c.name,
      address: `${c.street}, ${c.suburb} ${c.postcode}`,
      plan: c.plan,
      stories: c.stories,
      panels: c.panels,
      date: date.toISOString().split("T")[0],
    }));
  });

  jobs.sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json(jobs);
}
