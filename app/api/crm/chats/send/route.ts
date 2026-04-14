import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createFanvueClient } from "@/lib/fanvue";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { chatId: string; content: string; isPpv?: boolean; ppvPrice?: number };
    const db = supabaseAdmin();

    const { data: conn } = await db.from("fanvue_connection").select("api_key").limit(1).single();
    if (!conn) return NextResponse.json({ error: "Fanvue not connected" }, { status: 400 });

    const client = createFanvueClient(conn.api_key);
    const sent = await client.sendMessage({
      chatId: body.chatId,
      content: body.content,
      isPpv: body.isPpv,
      ppvPrice: body.ppvPrice,
    });

    // Find subscriber for this chat
    const { data: existingMsg } = await db.from("messages").select("subscriber_id").eq("fanvue_chat_id", body.chatId).limit(1).single();

    const { data: saved } = await db.from("messages").insert({
      fanvue_chat_id: body.chatId,
      fanvue_message_id: sent.id,
      subscriber_id: existingMsg?.subscriber_id ?? null,
      direction: "outbound",
      content: body.content,
      media_urls: [],
      sent_at: new Date().toISOString(),
      is_ppv: body.isPpv ?? false,
      ppv_price: body.ppvPrice ?? null,
      ppv_unlocked: false,
    }).select().single();

    return NextResponse.json(saved);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
