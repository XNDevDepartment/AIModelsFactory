import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { FanvueClient } from "@/lib/fanvue";

/** GET — return current connection status */
export async function GET() {
  try {
    const db = supabaseAdmin();
    const { data } = await db.from("fanvue_connection").select("*").limit(1).single();
    if (!data) return NextResponse.json({ connected: false });
    return NextResponse.json({
      connected: true,
      username: data.username,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      lastSync: data.last_sync_at,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

/** POST — save API key, verify with Fanvue, store connection */
export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json() as { apiKey: string };
    if (!apiKey) return NextResponse.json({ error: "apiKey is required" }, { status: 400 });

    const client = new FanvueClient(apiKey);
    const me = await client.getMe();

    const db = supabaseAdmin();
    const { data: existing } = await db.from("fanvue_connection").select("id").limit(1).single();

    const record = {
      api_key: apiKey,
      creator_id: me.id,
      username: me.username,
      display_name: me.displayName,
      avatar_url: me.avatarUrl,
    };

    if (existing) {
      await db.from("fanvue_connection").update(record).eq("id", existing.id);
    } else {
      await db.from("fanvue_connection").insert(record);
    }

    return NextResponse.json({
      connected: true,
      username: me.username,
      displayName: me.displayName,
      avatarUrl: me.avatarUrl,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save connection";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
