import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import DraftEditor from "./DraftEditor";

export const dynamic = "force-dynamic";

export default async function EditDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: draft, error } = await db
    .from("content_drafts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !draft) notFound();

  return <DraftEditor draft={draft} />;
}
