import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import AutomationEditor from "./AutomationEditor";

export const dynamic = "force-dynamic";

export default async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: automation, error } = await db
    .from("automations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !automation) notFound();

  const { data: logs } = await db
    .from("automation_logs")
    .select("*")
    .eq("automation_id", id)
    .order("triggered_at", { ascending: false })
    .limit(20);

  return <AutomationEditor automation={automation} logs={logs ?? []} />;
}
