import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { triggerAutomations } from "@/lib/automation-engine";

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expected}`)
  );
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-fanvue-signature") ?? "";
  const secret = process.env.FANVUE_WEBHOOK_SECRET ?? "";

  // Verify signature if secret is set
  if (secret && !verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.type as string;
  const db = supabaseAdmin();

  // Store the event
  const { data: event } = await db.from("webhook_events").insert({
    event_type: eventType,
    payload: payload as import("@/lib/database.types").Json,
  }).select("id").single();

  try {
    // Get Fanvue API key for automation actions
    const { data: conn } = await db.from("fanvue_connection").select("api_key,creator_id").limit(1).single();
    const apiKey = conn?.api_key ?? "";

    let subscriberId: string | undefined;
    let fanvueChatId: string | undefined;
    let messageContent: string | undefined;

    // Upsert subscriber if present in event
    const fanSub = payload.subscriber as Record<string, unknown> | undefined;
    if (fanSub?.id) {
      const { data: sub } = await db
        .from("subscribers")
        .upsert({
          fanvue_id: String(fanSub.id),
          username: String(fanSub.username ?? ""),
          display_name: String(fanSub.displayName ?? ""),
          avatar_url: String(fanSub.avatarUrl ?? ""),
          subscribed_at: String(fanSub.subscribedAt ?? new Date().toISOString()),
          status: "active",
          synced_at: new Date().toISOString(),
        }, { onConflict: "fanvue_id" })
        .select("id")
        .single();
      subscriberId = sub?.id;
    }

    // Handle message events — store message + set context
    if (eventType === "message.received") {
      const msg = payload.message as Record<string, unknown>;
      fanvueChatId = String(msg?.chatId ?? "");
      messageContent = String(msg?.content ?? "");

      if (subscriberId && fanvueChatId) {
        await db.from("messages").upsert({
          fanvue_chat_id: fanvueChatId,
          fanvue_message_id: String(msg?.id ?? ""),
          subscriber_id: subscriberId,
          direction: "inbound",
          content: messageContent,
          media_urls: (msg?.mediaUrls as string[]) ?? [],
          sent_at: String(msg?.sentAt ?? new Date().toISOString()),
          is_ppv: false,
          ppv_unlocked: false,
        }, { onConflict: "fanvue_message_id" });

        await db.from("subscribers").update({ last_message_at: new Date().toISOString() }).eq("id", subscriberId);
      }
    }

    // Map Fanvue event types to our trigger types
    const triggerMap: Record<string, string> = {
      "subscriber.new":      "new_subscriber",
      "subscriber.renewal":  "renewal",
      "subscriber.churn":    "churn",
      "message.received":    "message_received",
      "tip.received":        "tip_received",
    };

    const triggerType = triggerMap[eventType];
    if (triggerType && apiKey) {
      await triggerAutomations(
        triggerType as import("@/lib/automation-engine").TriggerType,
        { subscriberId, fanvueChatId, messageContent, eventPayload: payload },
        apiKey
      );
    }

    // Mark processed
    if (event?.id) {
      await db.from("webhook_events").update({
        processed_at: new Date().toISOString(),
        automation_triggered: !!triggerType,
      }).eq("id", event.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Processing error";
    if (event?.id) {
      await db.from("webhook_events").update({ error: msg }).eq("id", event.id);
    }
    console.error("Webhook error:", err);
    return NextResponse.json({ ok: true }); // always 200 to Fanvue
  }
}
