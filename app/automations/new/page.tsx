"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import Link from "next/link";

type ActionType = "send_message" | "send_ppv" | "ai_reply" | "add_tag" | "remove_tag" | "add_note" | "wait";

interface Action {
  type: ActionType;
  config: Record<string, unknown>;
}

const TRIGGERS = [
  { value: "new_subscriber",   label: "New Subscriber" },
  { value: "message_received", label: "Message Received" },
  { value: "renewal",          label: "Subscription Renewed" },
  { value: "churn",            label: "Subscription Cancelled" },
  { value: "tip_received",     label: "Tip Received" },
  { value: "manual",           label: "Manual (trigger from CRM)" },
];

const ACTION_TYPES: { value: ActionType; label: string; description: string }[] = [
  { value: "send_message", label: "Send Message", description: "Send a text message to the subscriber" },
  { value: "send_ppv",     label: "Send PPV",     description: "Send a pay-per-view message with price" },
  { value: "ai_reply",     label: "AI Reply",     description: "Generate and send an AI reply using Gemini" },
  { value: "add_tag",      label: "Add Tag",      description: "Add a tag to the subscriber" },
  { value: "remove_tag",   label: "Remove Tag",   description: "Remove a tag from the subscriber" },
  { value: "add_note",     label: "Add Note",     description: "Append a private note to the subscriber" },
  { value: "wait",         label: "Wait",         description: "Wait N seconds before the next action" },
];

function ActionEditor({ action, index, onChange, onRemove }: {
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

      {/* Config fields per action type */}
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
            min="3"
            step="0.01"
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

function NewAutomationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("new_subscriber");
  const [actions, setActions] = useState<Action[]>([
    { type: "send_message", config: { content: "" } },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from template if provided
  useEffect(() => {
    const tpl = searchParams.get("template");
    if (tpl) {
      try {
        const parsed = JSON.parse(decodeURIComponent(tpl));
        if (parsed.name) setName(parsed.name);
        if (parsed.trigger_type) setTriggerType(parsed.trigger_type);
        if (parsed.actions) setActions(parsed.actions);
        if (parsed.description) setDescription(parsed.description);
      } catch {}
    }
  }, [searchParams]);

  const updateAction = (index: number, action: Action) => {
    setActions((prev) => prev.map((a, i) => (i === index ? action : a)));
  };

  const removeAction = (index: number) => {
    setActions((prev) => prev.filter((_, i) => i !== index));
  };

  const addAction = () => {
    setActions((prev) => [...prev, { type: "send_message", config: { content: "" } }]);
  };

  const save = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    if (actions.length === 0) { setError("Add at least one action"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, trigger_type: triggerType, actions, conditions: [] }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.push("/automations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6 lg:p-10">
      <Link href="/automations" className="flex items-center gap-2 text-sm text-white/40 hover:text-white mb-8 transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" />
        Back to Automations
      </Link>

      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-bold mb-1">New Automation</h1>
          <p className="text-sm text-white/40">Define a trigger and the actions to run automatically</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm">{error}</div>
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
          <p className="mt-2 text-xs text-white/25">This automation will run every time the selected event occurs on Fanvue.</p>
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
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Automation"}
        </button>
      </div>
    </div>
  );
}

export default function NewAutomationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <NewAutomationForm />
    </Suspense>
  );
}
