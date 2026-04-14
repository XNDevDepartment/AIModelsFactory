import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createFanvueClient } from "@/lib/fanvue";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as import("@/lib/database.types").Database["public"]["Tables"]["content_drafts"]["Update"];
    const db = supabaseAdmin();

    const { data, error } = await db
      .from("content_drafts")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update draft";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = supabaseAdmin();
    const { error } = await db.from("content_drafts").delete().eq("id", id);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete draft";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/workspace/drafts/[id] — publish draft to Fanvue */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = supabaseAdmin();

    const { data: draft, error: draftErr } = await db
      .from("content_drafts")
      .select("*")
      .eq("id", id)
      .single();

    if (draftErr || !draft) throw new Error("Draft not found");

    const { data: conn } = await db.from("fanvue_connection").select("api_key").limit(1).single();
    if (!conn) throw new Error("Fanvue not connected — add your API key in Settings");

    const client = createFanvueClient(conn.api_key);
    const post = await client.createPost({
      body: draft.body,
      mediaUrls: draft.media_urls as string[],
      price: draft.price ?? undefined,
      scheduledAt: draft.scheduled_at ?? undefined,
    });

    await db
      .from("content_drafts")
      .update({
        status: draft.scheduled_at ? "scheduled" : "published",
        published_at: draft.scheduled_at ? null : new Date().toISOString(),
        fanvue_post_id: post.id,
      })
      .eq("id", id);

    return NextResponse.json({ success: true, post_id: post.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
