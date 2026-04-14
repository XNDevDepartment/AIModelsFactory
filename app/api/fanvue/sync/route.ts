import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { FanvueClient } from "@/lib/fanvue";

export async function POST() {
  try {
    const db = supabaseAdmin();

    const { data: conn } = await db.from("fanvue_connection").select("*").limit(1).single();
    if (!conn) return NextResponse.json({ error: "No Fanvue account connected." }, { status: 400 });

    const client = new FanvueClient(conn.api_key);

    // ── Sync subscribers ──────────────────────────────────────
    const subscribers = await client.getAllSubscribers();

    for (const sub of subscribers) {
      await db.from("subscribers").upsert(
        {
          fanvue_id: sub.id,
          username: sub.username,
          display_name: sub.displayName,
          avatar_url: sub.avatarUrl,
          email: sub.email ?? null,
          subscription_tier: sub.subscriptionTier ?? null,
          subscribed_at: sub.subscribedAt,
          expires_at: sub.expiresAt ?? null,
          total_spent: sub.totalSpent ?? 0,
          status: sub.status,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "fanvue_id" }
      );
    }

    // ── Sync recent chats (last 50) ────────────────────────────
    const { data: chats } = await client.getChats({ limit: 50 });
    let messageCount = 0;

    for (const chat of chats) {
      // Find subscriber in DB
      const { data: sub } = await db
        .from("subscribers")
        .select("id")
        .eq("fanvue_id", chat.subscriberId)
        .single();

      if (!sub) continue;

      // Sync recent messages for this chat
      const { data: msgs } = await client.getMessages(chat.id, { limit: 30 });
      for (const msg of msgs) {
        await db.from("messages").upsert(
          {
            fanvue_chat_id: chat.id,
            fanvue_message_id: msg.id,
            subscriber_id: sub.id,
            direction: msg.senderId === conn.creator_id ? "outbound" : "inbound",
            content: msg.content,
            media_urls: msg.mediaUrls ?? [],
            sent_at: msg.sentAt,
            read_at: msg.readAt ?? null,
            is_ppv: msg.isPpv ?? false,
            ppv_price: msg.ppvPrice ?? null,
            ppv_unlocked: msg.ppvUnlocked ?? false,
          },
          { onConflict: "fanvue_message_id" }
        );
        messageCount++;
      }

      // Update last_message_at on subscriber
      if (msgs.length > 0) {
        await db
          .from("subscribers")
          .update({ last_message_at: msgs[0].sentAt })
          .eq("id", sub.id);
      }
    }

    // Update last_sync_at
    await db
      .from("fanvue_connection")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", conn.id);

    return NextResponse.json({ subscriberCount: subscribers.length, messageCount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
