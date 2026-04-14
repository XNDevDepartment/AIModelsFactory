"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Trash2, Plus, Zap,
  CheckCircle, XCircle, Loader2, Play, Pause,
} from "lucide-react";
import Link from "next/link";

type ActionType = "send_message" | "send_ppv" | "ai_reply" | "add_tag" | "remove_tag" | "add_note" | "wait";

interface Action {
  type: ActionType;
  config: Record<string, unknown>;
}

interface Automation {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger_type: string;
  conditions: unknown;
  actions: unknown;
  trigger_count: number;
  last_triggered_at: string | null;
  created_at: string;
}

interface Log {
  id: string;
  triggered_at: string;
  status: string;
  actions_taken: unknown;
}

const TRIGGERS = [
  { value: "new_subscriber",   label: "New Subscriber" },
  { value: "message_received", label: "Message Received" },
  { value: "renewal",          label: "Subscription Renewed" },
  { value: "churn",            label: "Subscription Cancelled" },
  { value: "tip_received",     label: "Tip Received" },
  { value: "manual",           label: "Manual" },
];

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: "send_message", label: "Send Message" },
  { value: "send_ppv",     label: "Send PPV" },
  { value: "ai_reply",     label: "AI Reply" },
  { value: "add_tag",      label: "Add Tag" },
  { value: "remove_tag",   label: "Remove Tag" },
  { value: "add_note",     label: "Add Note" },
  { value: "wait",         label: "Wait" },
];

function ActionEditor({
  action, index, onChange, onRemove,
}: {
  action: Action;
  index: number;
  onChange: (a: Action) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/30 font-semibold w-6">{index + 1}.</span>
        <select
          value={action.type}
          onChange={(e) => onChange({ type: e.target.value as ActionType, config: {} })}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500/40"
        >
          {ACTION_TYPES.map((t) => (
            <option key={t.value} value={t.value} className="bg-slate-900">{t.label}</option>
          ))}
        </select>
        <button onClick={onRemove} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {(action.type === "send_message" || action.type === "add_note") && (
        <textarea
          value={String(action.config.content ?? "")}
          onChange={(e) => onChange({ ...action, config: { ...action.config, content: e.target.value } })}
          placeholder={action.type === "send_message" ? "Message content…" : "Note text…"}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none"
        />
      )}
      {action.type === "send_ppv" && (
        <div className="space-y-2">
          <textarea
            value={String(action.config.content ?? "")}
            onChange={(e) => onChange({ ...action, config: { ...action.config, content: e.target.value } })}
            placeholder="PPV message caption…"
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-white/20 focus:outline-none resize-none"
          />
          <input
            type="number"
            value={String(action.config.price ?? "9.99")}
            onChange={(e) => onChange({ ...action, config: { ...action.config, price: parseFloat(e.target.value) } })}
            placeholder="Price ($)"
            min="3" step="0.01"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>
      )}
      {action.type === "ai_reply" && (
        <textarea
          value={String(action.config.context ?? "")}
          onChange={(e) => onChange({ ...action, config: { ...action.config, context: e.target.value } })}
          placeholder="Extra context for the AI (tone, what to offer, what to avoid)…"
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-white/20 focus:outline-none resize-none"
        />
      )}
      {(action.type === "add_tag" || action.type === "remove_tag") && (
        <input
          value={String(action.config.tag ?? "")}
          onChange={(e) => onChange({ ...action, config: { ...action.config, tag: e.target.value } })}
          placeholder="Tag name…"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-white/20 focus:outline-none"
        />
      )}
      {action.type === "wait" && (
        <input
          type="number"
          value={String(action.config.seconds ?? "30")}
          onChange={(e) => onChange({ ...action, config: { ...action.config, seconds: parseInt(e.target.value) } })}
          placeholder="Seconds to wait"
          min="1"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none"
        />
      )}
    </div>
  );
}

export default function AutomationEditor({
  automation,
  logs,
}: {
  automation: Automation;
  logs: Log[];
}) {
  const router = useRouter();

  const [name, setName]               = useState(automation.name);
  const [description, setDescription] = useState(automation.description ?? "");
  const [triggerType, setTriggerType] = useState(automation.trigger_type);
  const [enabled, setEnabled]         = useState(automation.enabled);
  const [actions, setActions]         = useState<Action[]>(
    Array.isArray(automation.actions) ? (automation.actions as Action[]) : []
  );

  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [saved, setSaved]     = useState(false);

  const updateAction = (i: number, a: Action) =>
    setActions((prev) => prev.map((x, idx) => (idx === i ? a : x)));
  const removeAction = (i: number) =>
    setActions((prev) => prev.filter((_, idx) => idx !== i));
  const addAction = () =>
    setActions((prev) => [...prev, { type: "send_message", config: { content: "" } }]);

  const save = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/automations/${automation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, trigger_type: triggerType, actions, enabled }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this automation permanently?")) return;
    setDeleting(true);
    await fetch(`/api/automations/${automation.id}`, { method: "DELETE" });
    router.push("/automations");
  };

  const toggleEnabled = async () => {
    const next = !enabled;
    setEnabled(next);
    await fetch(`/api/automations/${automation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6 lg:p-10">
      <div className="flex items-center justify-between mb-8">
        <Link href="/automations" className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Automations
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-red-400 transition-colors disabled:opacity-40"
        >
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Delete
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">{name || "Untitled Automation"}</h1>
              <div className="flex items-center gap-3 text-xs text-white/30 mt-0.5">
                <span>Triggered {automation.trigger_count}×</span>
                {automation.last_triggered_at && (
                  <span>Last: {new Date(automation.last_triggered_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            <button
              onClick={toggleEnabled}
              className={`relative w-10 shrink-0 rounded-full border transition-all duration-200 ${
                enabled ? "bg-violet-600 border-violet-500" : "bg-white/10 border-white/15"
              }`}
              style={{ height: "22px" }}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                enabled ? "left-[calc(100%-18px)]" : "left-0.5"
              }`} />
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}
          {saved && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Saved
            </div>
          )}

          {/* Name & description */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Automation name…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold placeholder:text-white/20 focus:outline-none focus:border-violet-500/40"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description (optional)…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40"
            />
          </div>

          {/* Trigger */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block mb-3">Trigger</label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500/40"
            >
              {TRIGGERS.map((t) => (
                <option key={t.value} value={t.value} className="bg-slate-900">{t.label}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block">Actions</label>
            {actions.map((action, i) => (
              <ActionEditor
                key={i}
                action={action}
                index={i}
                onChange={(a) => updateAction(i, a)}
                onRemove={() => removeAction(i)}
              />
            ))}
            <button
              onClick={addAction}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/15 text-white/40 hover:text-white/60 hover:border-white/25 transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Action
            </button>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>

        {/* Run history */}
        <div>
          <h2 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">Run History</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {logs.length === 0 ? (
              <div className="p-6 text-center text-white/25 text-xs">No runs yet</div>
            ) : (
              <div className="divide-y divide-white/5">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                    {log.status === "success" ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : log.status === "partial" ? (
                      <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-medium capitalize ${
                          log.status === "success" ? "text-emerald-300" :
                          log.status === "partial"  ? "text-yellow-300" : "text-red-300"
                        }`}>
                          {log.status}
                        </span>
                        <span className="text-xs text-white/20 shrink-0">
                          {new Date(log.triggered_at).toLocaleString([], {
                            month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {Array.isArray(log.actions_taken) && (log.actions_taken as Array<{type: string; ok: boolean}>).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(log.actions_taken as Array<{type: string; ok: boolean}>).map((a, i) => (
                            <span key={i} className={`text-xs px-1.5 py-0.5 rounded border ${
                              a.ok
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}>
                              {a.type.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">Stats</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xl font-bold">{automation.trigger_count}</p>
                <p className="text-xs text-white/35">Total runs</p>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {logs.length > 0
                    ? Math.round((logs.filter((l) => l.status === "success").length / logs.length) * 100)
                    : "—"}
                  {logs.length > 0 ? "%" : ""}
                </p>
                <p className="text-xs text-white/35">Success rate</p>
              </div>
            </div>
            <div className="text-xs text-white/25">
              Created {new Date(automation.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
