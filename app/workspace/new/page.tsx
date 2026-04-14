"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Sparkles, Loader2, DollarSign, Calendar } from "lucide-react";
import Link from "next/link";

const POST_TYPES = [
  { value: "post",         label: "Post",         description: "Regular free post for all subscribers" },
  { value: "ppv",          label: "PPV",          description: "Pay-per-view locked content" },
  { value: "story",        label: "Story",        description: "Short-lived story post" },
  { value: "mass_message", label: "Mass Message", description: "Send directly to all subscribers" },
];

export default function NewDraftPage() {
  const router = useRouter();

  const [type, setType]           = useState("post");
  const [title, setTitle]         = useState("");
  const [body, setBody]           = useState("");
  const [price, setPrice]         = useState("9.99");
  const [mediaUrls, setMediaUrls] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving]       = useState(false);
  const [generating, setGenerating] = useState(false);
  const [hint, setHint]           = useState("");
  const [error, setError]         = useState<string | null>(null);

  const generateCaption = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/ai-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, hint: hint || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { caption } = await res.json() as { caption: string };
      setBody(caption);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!body.trim()) { setError("Body / caption is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const urls = mediaUrls
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean);

      const res = await fetch("/api/workspace/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || body.slice(0, 60),
          type,
          body,
          media_urls: urls,
          price: type === "ppv" ? parseFloat(price) : null,
          scheduled_at: scheduledAt || null,
          ai_generated: false,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.push("/workspace");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6 lg:p-10">
      <Link
        href="/workspace"
        className="flex items-center gap-2 text-sm text-white/40 hover:text-white mb-8 transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Workspace
      </Link>

      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-bold mb-1">New Draft</h1>
          <p className="text-sm text-white/40">Write content and optionally publish or schedule it to Fanvue</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Post type */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block">
            Content Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {POST_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`text-left px-4 py-3 rounded-xl border transition-all ${
                  type === t.value
                    ? "border-violet-500/50 bg-violet-500/10"
                    : "border-white/10 bg-white/3 hover:border-white/20"
                }`}
              >
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="text-xs text-white/35 mt-0.5">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional — auto-generated from caption)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40"
          />
        </div>

        {/* Caption / body */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">
              Caption / Body
            </label>
            <div className="flex items-center gap-2">
              <input
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="AI hint (optional)…"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 w-48"
              />
              <button
                onClick={generateCaption}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition-all text-xs font-medium disabled:opacity-40"
              >
                {generating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                AI Caption
              </button>
            </div>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your caption or message…"
            rows={6}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none"
          />
        </div>

        {/* Media URLs */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block">
            Media URLs (one per line, optional)
          </label>
          <textarea
            value={mediaUrls}
            onChange={(e) => setMediaUrls(e.target.value)}
            placeholder="https://…"
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none"
          />
        </div>

        {/* PPV price */}
        {type === "ppv" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block mb-3">
              PPV Price
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="3"
                step="0.01"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500/40"
              />
            </div>
          </div>
        )}

        {/* Schedule */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block mb-3">
            Schedule (optional)
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500/40 [color-scheme:dark]"
            />
          </div>
          <p className="mt-2 text-xs text-white/25">Leave blank to save as a draft for manual publishing later.</p>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : "Save Draft"}
        </button>
      </div>
    </div>
  );
}
