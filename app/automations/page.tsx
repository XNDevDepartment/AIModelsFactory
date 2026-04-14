import Link from "next/link";
import { Zap, Plus, Play, Pause, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import ToggleAutomation from "./ToggleAutomation";

export const dynamic = "force-dynamic";

const TRIGGER_LABELS: Record<string, string> = {
  new_subscriber:   "New Subscriber",
  message_received: "Message Received",
  renewal:          "Subscription Renewed",
  churn:            "Subscription Cancelled",
  tip_received:     "Tip Received",
  manual:           "Manual",
  schedule:         "Scheduled",
};

const TRIGGER_COLORS: Record<string, string> = {
  new_subscriber:   "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  message_received: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  renewal:          "bg-violet-500/15 text-violet-300 border-violet-500/20",
  churn:            "bg-red-500/15 text-red-300 border-red-500/20",
  tip_received:     "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
  manual:           "bg-white/10 text-white/50 border-white/15",
  schedule:         "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
};

// Default automation templates to seed the UI
const TEMPLATES = [
  {
    name: "Welcome New Subscriber",
    description: "Auto-send a warm welcome message when someone subscribes",
    trigger_type: "new_subscriber",
    actions: [{ type: "send_message", config: { content: "Hey! 👋 Thanks so much for subscribing! I'm so excited to have you here. Feel free to message me anytime! 💕" } }],
  },
  {
    name: "AI Auto-Reply to DMs",
    description: "Automatically reply to incoming messages using AI in your voice",
    trigger_type: "message_received",
    actions: [{ type: "ai_reply", config: { context: "Be friendly, flirty, and keep replies short. Always offer to share more exclusive content." } }],
  },
  {
    name: "PPV Upsell on Renewal",
    description: "Send a PPV offer when a subscriber renews",
    trigger_type: "renewal",
    actions: [
      { type: "send_message", config: { content: "Thank you for renewing! 🙏 I just added something really special for loyal fans like you — check this out! 🔥" } },
      { type: "send_ppv", config: { content: "Exclusive content just for you 💋", price: 9.99 } },
    ],
  },
  {
    name: "Tag High Spenders",
    description: "Automatically tag subscribers who spend over $50 as VIP",
    trigger_type: "tip_received",
    conditions: [{ field: "subscriber.total_spent", operator: "gt", value: 50 }],
    actions: [
      { type: "add_tag", config: { tag: "vip" } },
      { type: "send_message", config: { content: "Thank you SO much for your generous support! You're officially one of my VIPs 👑" } },
    ],
  },
];

export default async function AutomationsPage() {
  const db = supabaseAdmin();
  const { data: automations } = await db
    .from("automations")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: recentLogs } = await db
    .from("automation_logs")
    .select("*")
    .order("triggered_at", { ascending: false })
    .limit(10);

  // Build a lookup from automation id → name
  const automationNames = Object.fromEntries(
    (automations ?? []).map((a) => [a.id, a.name])
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Automations</h1>
            <p className="text-sm text-white/40">Auto-reply, welcome sequences, PPV drips & more</p>
          </div>
        </div>
        <Link
          href="/automations/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all text-sm font-semibold shadow-lg shadow-violet-500/20"
        >
          <Plus className="w-4 h-4" />
          New Automation
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Active automations */}
          <div>
            <h2 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
              Your Automations {automations?.length ? `(${automations.length})` : ""}
            </h2>

            {(!automations || automations.length === 0) ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                <Zap className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm mb-4">No automations yet — start with a template below</p>
              </div>
            ) : (
              <div className="space-y-3">
                {automations.map((auto) => (
                  <div key={auto.id} className="flex items-center gap-4 bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl px-5 py-4 transition-all group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{auto.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${TRIGGER_COLORS[auto.trigger_type] ?? TRIGGER_COLORS.manual}`}>
                          {TRIGGER_LABELS[auto.trigger_type] ?? auto.trigger_type}
                        </span>
                      </div>
                      {auto.description && <p className="text-xs text-white/40 truncate">{auto.description}</p>}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-white/25">
                        <span>{(auto.actions as unknown[]).length} action{(auto.actions as unknown[]).length !== 1 ? "s" : ""}</span>
                        {auto.trigger_count > 0 && <span>Triggered {auto.trigger_count}×</span>}
                        {auto.last_triggered_at && <span>Last: {new Date(auto.last_triggered_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ToggleAutomation id={auto.id} enabled={auto.enabled} />
                      <Link
                        href={`/automations/${auto.id}`}
                        className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Templates */}
          <div>
            <h2 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Quick-Start Templates</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {TEMPLATES.map((tpl) => (
                <Link
                  key={tpl.name}
                  href={`/automations/new?template=${encodeURIComponent(JSON.stringify(tpl))}`}
                  className="bg-white/5 border border-white/10 hover:border-violet-500/30 hover:bg-violet-500/5 rounded-2xl p-4 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-sm">{tpl.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border shrink-0 ${TRIGGER_COLORS[tpl.trigger_type] ?? TRIGGER_COLORS.manual}`}>
                      {TRIGGER_LABELS[tpl.trigger_type]}
                    </span>
                  </div>
                  <p className="text-xs text-white/40">{tpl.description}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-3 h-3" />
                    Use template
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Activity log */}
        <div>
          <h2 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Recent Activity</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {(!recentLogs || recentLogs.length === 0) ? (
              <div className="p-6 text-center text-white/25 text-xs">No activity yet</div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                    {log.status === "success" ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {log.automation_id ? (automationNames[log.automation_id] ?? "Automation") : "Automation"}
                      </p>
                      <p className="text-xs text-white/25">{new Date(log.triggered_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs shrink-0">
                      {log.status === "success" ? (
                        <Play className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Pause className="w-3 h-3 text-red-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
