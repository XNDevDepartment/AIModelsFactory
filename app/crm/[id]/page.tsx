import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare, DollarSign, Calendar, Tag } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import SubscriberActions from "./SubscriberActions";

export const dynamic = "force-dynamic";

export default async function SubscriberProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: sub } = await db.from("subscribers").select("*").eq("id", id).single();
  if (!sub) notFound();

  const { data: messages } = await db
    .from("messages")
    .select("*")
    .eq("subscriber_id", id)
    .order("sent_at", { ascending: false })
    .limit(20);

  const { data: automationLogs } = await db
    .from("automation_logs")
    .select("*")
    .eq("subscriber_id", id)
    .order("triggered_at", { ascending: false })
    .limit(10);

  // Build automation name lookup
  const logAutomationIds = [...new Set((automationLogs ?? []).map((l) => l.automation_id).filter(Boolean))] as string[];
  const { data: logAutomations } = logAutomationIds.length
    ? await db.from("automations").select("id, name").in("id", logAutomationIds)
    : { data: [] };
  const automationNameMap = Object.fromEntries((logAutomations ?? []).map((a) => [a.id, a.name]));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6 lg:p-10">
      <Link href="/crm" className="flex items-center gap-2 text-sm text-white/40 hover:text-white mb-8 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        Back to Subscribers
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: profile */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-5">
              {sub.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sub.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-violet-500/20 flex items-center justify-center text-xl font-bold text-violet-300">
                  {sub.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="font-bold text-lg">{sub.display_name ?? sub.username}</h1>
                <p className="text-white/40 text-sm">@{sub.username}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <DollarSign className="w-4 h-4 text-fuchsia-400 mx-auto mb-1" />
                <p className="font-bold text-fuchsia-300">${(sub.total_spent ?? 0).toFixed(0)}</p>
                <p className="text-xs text-white/30">Total spent</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <Calendar className="w-4 h-4 text-violet-400 mx-auto mb-1" />
                <p className="font-bold text-violet-300">
                  {sub.subscribed_at ? Math.floor((Date.now() - new Date(sub.subscribed_at).getTime()) / 86400000) : "—"}
                </p>
                <p className="text-xs text-white/30">Days subscribed</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-white/40">Status</span>
                <span className={`capitalize font-medium ${sub.status === "active" ? "text-emerald-400" : "text-red-400"}`}>{sub.status}</span>
              </div>
              {sub.subscription_tier && (
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-white/40">Tier</span>
                  <span className="text-white/70">{sub.subscription_tier}</span>
                </div>
              )}
              {sub.email && (
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-white/40">Email</span>
                  <span className="text-white/70 truncate max-w-36">{sub.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tags & Notes — client actions */}
          <SubscriberActions id={id} tags={sub.tags ?? []} notes={sub.notes ?? ""} />

          {/* Chat link */}
          <Link
            href={`/chats?subscriber=${sub.fanvue_id}`}
            className="flex items-center gap-3 bg-white/5 border border-white/10 hover:bg-white/8 hover:border-violet-500/30 rounded-2xl p-4 transition-all group"
          >
            <MessageSquare className="w-5 h-5 text-violet-400" />
            <div className="flex-1">
              <p className="font-medium text-sm">Open Chat</p>
              <p className="text-xs text-white/30">
                {sub.last_message_at
                  ? `Last message ${new Date(sub.last_message_at).toLocaleDateString()}`
                  : "No messages yet"}
              </p>
            </div>
            <ArrowLeft className="w-4 h-4 rotate-180 text-white/20 group-hover:text-violet-400 transition-colors" />
          </Link>
        </div>

        {/* Right: activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent messages */}
          <div>
            <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-3">Recent Messages</h2>
            <div className="space-y-2">
              {(messages ?? []).length === 0 ? (
                <p className="text-white/25 text-sm py-4">No messages yet</p>
              ) : (
                messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.direction === "outbound" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
                        msg.direction === "outbound"
                          ? "bg-violet-600/30 border border-violet-500/20 text-white"
                          : "bg-white/8 border border-white/10 text-white/80"
                      }`}
                    >
                      <p>{msg.content || "(media)"}</p>
                      {msg.is_ppv && (
                        <span className="text-xs text-fuchsia-300 mt-1 block">
                          PPV ${msg.ppv_price} · {msg.ppv_unlocked ? "Unlocked" : "Locked"}
                        </span>
                      )}
                      <p className="text-xs text-white/30 mt-1">
                        {new Date(msg.sent_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Automation activity */}
          {(automationLogs?.length ?? 0) > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-3">Automation Activity</h2>
              <div className="space-y-2">
                {automationLogs?.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                    <Tag className="w-4 h-4 text-violet-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {log.automation_id ? (automationNameMap[log.automation_id] ?? "Automation") : "Automation"}
                      </p>
                      <p className="text-xs text-white/30">{new Date(log.triggered_at).toLocaleString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      log.status === "success"
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                        : "bg-red-500/10 text-red-300 border-red-500/20"
                    }`}>
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
