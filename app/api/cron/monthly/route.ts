import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Runs on the 5th of each month (Vercel Cron). Raises an in-app reminder if the
 * current month's R20 has not been imported yet. Auth: Vercel sends
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const label = now.toLocaleString("en-GB", { month: "long", year: "numeric" });

  const { data: existing } = await supabase
    .from("reporting_periods")
    .select("id, r20_uploads(status)")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  const imported =
    existing &&
    (existing.r20_uploads as { status?: string }[] | null)?.some((u) => u.status === "imported");

  if (!imported) {
    // avoid duplicate reminders in the same month
    const title = `Upload the ${label} R20`;
    const { data: dupe } = await supabase
      .from("notifications")
      .select("id")
      .eq("title", title)
      .gte("created_at", new Date(year, month - 1, 1).toISOString())
      .maybeSingle();
    if (!dupe) {
      await supabase.from("notifications").insert({
        kind: "system",
        title,
        body: `The ${label} Regional R20 has not been imported yet. Upload it in the R20 Centre to keep the analysis current.`,
        link: "/r20/upload",
      });
    }
  }

  return NextResponse.json({ ok: true, month: label, imported: !!imported });
}
