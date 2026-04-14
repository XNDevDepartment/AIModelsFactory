"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Sparkles, Loader2, Send,
  DollarSign, Calendar, Trash2, CheckCircle,
} from "lucide-react";
import Link from "next/link";

interface Draft {
  id: string;
  title: string;
  type: string;
  body: string;
  media_urls: string[];
  price: number | null;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  fanvue_post_id: string | null;
  ai_generated: boolean;
}

const POST_TYPES = [
  { value: "post",         label: "Post" },
  { value: "ppv",          label: "PPV" },
  { value: "story",        label: "Story" },
  { value: "mass_message", label: "Mass Message" },
];

export default function DraftEditor({ draft }: { draft: Draft }) {
  const router = useRouter();

  const [type, setType]         = useState(draft.type);
  const [title, setTitle]       = useState(draft.title ?? "");
  const [body, setBody]         = useState(draft.body ?? "");
  const [price, setPrice]       = useState(String(draft.price ?? "9.99"));
  const [mediaUrls, setMediaUrls] = useState((draft.media_urls ?? []).join("\n"));
  const [scheduledAt, setScheduledAt] = useState(
    draft.scheduled_at ? draft.scheduled_at.slice(0, 16) : ""
  );
  const [hint, setHint]         = useState("");

  const [saving, setSaving]     = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess]   = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const isPublished = draft.status === "published";

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
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const urls = mediaUrls.split("\n").map((u) => u.trim()).filter(Boolean);
      const res = await fetch(`/api/workspace/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || body.slice(0, 60),
          type,
          body,
          media_urls: urls,
          price: type === "ppv" ? parseFloat(price) : null,
          scheduled_at: scheduledAt || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess("Saved");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspace/drafts/${draft.id}`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      router.push("/workspace");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this draft permanently?")) return;
    setDeleting(true);
    await fetch(`/api/workspace/drafts/${draft.id}`, { method: "DELETE" });
    router.push("/workspace");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6 lg:p-10">
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/workspace"
          className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workspace
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>

      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-bold mb-1">Edit Draft</h1>
          {isPublished && (
            <p className="text-sm text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              Published{draft.fanvue_post_id ? ` · Fanvue ID: ${draft.fanvue_post_id}` : ""}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        {/* Type */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block">
            Content Type
          </label>
          <div className="flex gap-2 flex-wrap">
            {POST_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                disabled={isPublished}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                  type === t.value
                    ? "border-violet-500/50 bg-violet-500/10 text-white"
                    : "border-white/10 text-white/40 hover:border-white/20"
                } disabled:opacity-50`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isPublished}
          placeholder="Title (optional)"
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 disabled:opacity-50"
        />

        {/* Body */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">Caption / Body</label>
            {!isPublished && (
              <div className="flex items-center gap-2">
                <input
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="AI hint…"
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 w-40"
                />
                <button
                  onClick={generateCaption}
                  disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition-all text-xs font-medium disabled:opacity-40"
                >
                  {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  AI
                </button>
              </div>
            )}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={isPublished}
            placeholder="Write your caption or message…"
            rows={6}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none disabled:opacity-50"
          />
        </div>

        {/* Media URLs */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block">
            Media URLs (one per line)
          </label>
          <textarea
            value={mediaUrls}
            onChange={(e) => setMediaUrls(e.target.value)}
            disabled={isPublished}
            placeholder="https://…"
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none disabled:opacity-50"
          />
        </div>

        {/* PPV Price */}
        {type === "ppv" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block mb-3">PPV Price</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={isPublished}
                min="3"
                step="0.01"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500/40 disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {/* Schedule */}
        {!isPublished && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-widest block mb-3">Schedule</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500/40 [color-scheme:dark]"
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isPublished && (
          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-white/8 border border-white/15 hover:bg-white/12 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={publish}
              disabled={publishing}
              className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {publishing ? "Publishing…" : scheduledAt ? "Schedule" : "Publish Now"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
