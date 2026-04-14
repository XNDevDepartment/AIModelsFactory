import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const db = supabaseAdmin();
    let query = db.from("content_drafts").select("*").order("updated_at", { ascending: false });
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load drafts";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      title: string;
      type: string;
      body?: string;
      media_urls?: string[];
      tags?: string[];
      price?: number | null;
      scheduled_at?: string | null;
      ai_generated?: boolean;
    };

    const db = supabaseAdmin();
    const { data, error } = await db
      .from("content_drafts")
      .insert({
        title: body.title || "Untitled",
        type: body.type || "post",
        body: body.body ?? "",
        media_urls: body.media_urls ?? [],
        tags: body.tags ?? [],
        price: body.price ?? null,
        tier_id: null,
        status: "draft",
        scheduled_at: body.scheduled_at ?? null,
        published_at: null,
        fanvue_post_id: null,
        ai_generated: body.ai_generated ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create draft";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
