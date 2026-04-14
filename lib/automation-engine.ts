/**
 * Automation Engine
 * Evaluates rules and executes actions in response to Fanvue events.
 */

import { supabaseAdmin } from "./supabase";
import { createFanvueClient } from "./fanvue";
import { ask } from "./gemini";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TriggerType =
  | "new_subscriber"
  | "message_received"
  | "renewal"
  | "churn"
  | "tip_received"
  | "manual"
  | "schedule";

export interface AutomationCondition {
  field: string;    // e.g. "subscriber.total_spent", "message.content"
  operator: "eq" | "gt" | "lt" | "contains" | "not_contains";
  value: string | number;
}

export type ActionType =
  | "send_message"
  | "send_ppv"
  | "ai_reply"
  | "add_tag"
  | "remove_tag"
  | "add_note"
  | "wait";

export interface AutomationAction {
  type: ActionType;
  config: Record<string, unknown>;
  // send_message:  { content: string }
  // send_ppv:      { content: string; price: number; mediaUrls?: string[] }
  // ai_reply:      { personaId?: string; context?: string }
  // add_tag:       { tag: string }
  // remove_tag:    { tag: string }
  // add_note:      { note: string }
  // wait:          { seconds: number }
}

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

export interface TriggerContext {
  subscriberId?: string;
  fanvueChatId?: string;
  messageContent?: string;
  eventPayload?: Record<string, unknown>;
}

// ─── Condition evaluator ──────────────────────────────────────────────────────

function evaluate(condition: AutomationCondition, ctx: Record<string, unknown>): boolean {
  const parts = condition.field.split(".");
  let val: unknown = ctx;
  for (const p of parts) val = (val as Record<string, unknown>)?.[p];

  switch (condition.operator) {
    case "eq":           return val == condition.value;
    case "gt":           return Number(val) > Number(condition.value);
    case "lt":           return Number(val) < Number(condition.value);
    case "contains":     return String(val ?? "").toLowerCase().includes(String(condition.value).toLowerCase());
    case "not_contains": return !String(val ?? "").toLowerCase().includes(String(condition.value).toLowerCase());
    default:             return true;
  }
}

// ─── Action executor ──────────────────────────────────────────────────────────

async function executeAction(
  action: AutomationAction,
  context: TriggerContext,
  fanvueApiKey: string
): Promise<{ ok: boolean; detail?: string }> {
  const db = supabaseAdmin();
  const fv = createFanvueClient(fanvueApiKey);

  try {
    switch (action.type) {
      case "send_message": {
        if (!context.fanvueChatId) return { ok: false, detail: "No chatId in context" };
        const content = String(action.config.content ?? "");
        await fv.sendMessage({ chatId: context.fanvueChatId, content });
        return { ok: true, detail: `Sent: "${content.slice(0, 50)}"` };
      }

      case "send_ppv": {
        if (!context.fanvueChatId) return { ok: false, detail: "No chatId in context" };
        await fv.sendMessage({
          chatId: context.fanvueChatId,
          content: String(action.config.content ?? ""),
          isPpv: true,
          ppvPrice: Number(action.config.price),
          mediaUrls: action.config.mediaUrls as string[] | undefined,
        });
        return { ok: true, detail: `Sent PPV $${action.config.price}` };
      }

      case "ai_reply": {
        if (!context.fanvueChatId || !context.messageContent) {
          return { ok: false, detail: "No chatId or message content" };
        }

        // Load persona
        const personaId = action.config.personaId as string | undefined;
        const { data: personas } = await db
          .from("ai_personas")
          .select("*")
          .eq(personaId ? "id" : "is_default", personaId ?? true)
          .limit(1);

        const persona = personas?.[0];
        const systemPrompt = persona?.system_prompt ??
          "You are a friendly content creator replying to fans. Keep replies warm and concise.";

        const extraContext = action.config.context as string | undefined;

        const prompt = `${extraContext ? `Context: ${extraContext}\n\n` : ""}Fan message: "${context.messageContent}"\n\nWrite a reply:`;

        const reply = await ask(prompt, { system: systemPrompt });

        await fv.sendMessage({ chatId: context.fanvueChatId, content: reply });
        return { ok: true, detail: `AI replied: "${reply.slice(0, 50)}"` };
      }

      case "add_tag": {
        if (!context.subscriberId) return { ok: false, detail: "No subscriberId" };
        const tag = String(action.config.tag);
        const { data: sub } = await db.from("subscribers").select("tags").eq("id", context.subscriberId).single();
        const tags = Array.from(new Set([...(sub?.tags ?? []), tag]));
        await db.from("subscribers").update({ tags }).eq("id", context.subscriberId);
        return { ok: true, detail: `Added tag: ${tag}` };
      }

      case "remove_tag": {
        if (!context.subscriberId) return { ok: false, detail: "No subscriberId" };
        const tag = String(action.config.tag);
        const { data: sub } = await db.from("subscribers").select("tags").eq("id", context.subscriberId).single();
        const tags = (sub?.tags ?? []).filter((t: string) => t !== tag);
        await db.from("subscribers").update({ tags }).eq("id", context.subscriberId);
        return { ok: true, detail: `Removed tag: ${tag}` };
      }

      case "add_note": {
        if (!context.subscriberId) return { ok: false, detail: "No subscriberId" };
        const note = String(action.config.note);
        const { data: sub } = await db.from("subscribers").select("notes").eq("id", context.subscriberId).single();
        const notes = [(sub?.notes ?? ""), note].filter(Boolean).join("\n");
        await db.from("subscribers").update({ notes }).eq("id", context.subscriberId);
        return { ok: true, detail: "Note added" };
      }

      case "wait": {
        const ms = Number(action.config.seconds ?? 0) * 1000;
        await new Promise((r) => setTimeout(r, Math.min(ms, 30_000))); // max 30s in serverless
        return { ok: true, detail: `Waited ${action.config.seconds}s` };
      }

      default:
        return { ok: false, detail: `Unknown action: ${action.type}` };
    }
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ─── Main trigger function ────────────────────────────────────────────────────

export async function triggerAutomations(
  triggerType: TriggerType,
  context: TriggerContext,
  fanvueApiKey: string
): Promise<void> {
  const db = supabaseAdmin();

  // Load all enabled automations for this trigger type
  const { data: rules } = await db
    .from("automations")
    .select("*")
    .eq("trigger_type", triggerType)
    .eq("enabled", true);

  if (!rules || rules.length === 0) return;

  // Load subscriber for condition evaluation
  let subscriberData: Record<string, unknown> = {};
  if (context.subscriberId) {
    const { data: sub } = await db.from("subscribers").select("*").eq("id", context.subscriberId).single();
    if (sub) subscriberData = sub as Record<string, unknown>;
  }

  const evalContext = {
    subscriber: subscriberData,
    message: { content: context.messageContent ?? "" },
    event: context.eventPayload ?? {},
  };

  for (const rule of rules) {
    const conditions = (rule.conditions as unknown as AutomationCondition[]) ?? [];
    const allPassed = conditions.every((c) => evaluate(c, evalContext));
    if (!allPassed) continue;

    const actions = (rule.actions as unknown as AutomationAction[]) ?? [];
    const actionResults: Array<{ type: string; ok: boolean; detail?: string }> = [];
    let status: "success" | "failed" | "partial" = "success";

    for (const action of actions) {
      const result = await executeAction(action, context, fanvueApiKey);
      actionResults.push({ type: action.type, ...result });
      if (!result.ok) status = actionResults.every((r) => !r.ok) ? "failed" : "partial";
    }

    // Log the run
    await db.from("automation_logs").insert({
      automation_id: rule.id,
      subscriber_id: context.subscriberId ?? null,
      actions_taken: actionResults as unknown as import("./database.types").Json,
      status,
    });

    // Update trigger count + timestamp
    await db.from("automations").update({
      last_triggered_at: new Date().toISOString(),
      trigger_count: (rule.trigger_count ?? 0) + 1,
    }).eq("id", rule.id);
  }
}
