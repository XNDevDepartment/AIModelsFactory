"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Trash2, Send, Clock, CheckCircle2,
  PenSquare, DollarSign, ChevronRight, Loader2,
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
  created_at: string;
  updated_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  post:         "Post",
  ppv:          "PPV",
  story:        "Story",
  mass_message: "Mass Message",
};

const TYPE_COLORS: Record<string, string> = {
  post:         "bg-violet-500/15 text-violet-300 border-violet-500/20",
  ppv:          "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
  story:        "bg-blue-500/15 text-blue-300 border-blue-500/20",
  mass_message: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/20",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  draft:     PenSquare,
  scheduled: Clock,
  published: CheckCircle2,
};

const STATUS_COLORS: Record<string, string> = {
  draft:     "text-white/40",
  scheduled: "text-cyan-400",
  published: "text-emerald-400",
};

export default function DraftList({
  drafts,
  emptyMessage,
}: {
  drafts: Draft[];
  emptyMessage: string;
}) {
  const router = useRouter();
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const handlePublish = async (id: string) => {
    setPublishing(id);
    setError(null);
    try {
      const res = await fetch(`/api/workspace/drafts/${id}`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this draft?")) return;
    setDeleting(id);
    await fetch(`/api/workspace/drafts/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  };

  if (drafts.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
        <FileText className="w-10 h-10 text-white/10 mx-auto mb-3" />
        <p className="text-white/30 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {drafts.map((draft) => {
        const StatusIcon = STATUS_ICONS[draft.status] ?? PenSquare;
        const statusColor = STATUS_COLORS[draft.status] ?? "text-white/40";
        const isPublishing = publishing === draft.id;
        const isDeleting   = deleting   === draft.id;

        return (
          <div
            key={draft.id}
            className="flex items-center gap-4 bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl px-5 py-4 transition-all group"
          >
            {/* Status icon */}
            <StatusIcon className={`w-4 h-4 shrink-0 ${statusColor}`} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="font-semibold text-sm truncate">{draft.title || "Untitled"}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${TYPE_COLORS[draft.type] ?? TYPE_COLORS.post}`}
                >
                  {TYPE_LABELS[draft.type] ?? draft.type}
                </span>
                {draft.ai_generated && (
                  <span className="text-xs px-2 py-0.5 rounded-full border bg-violet-500/10 text-violet-400 border-violet-500/20 shrink-0">
                    AI
                  </span>
                )}
                {draft.price != null && draft.price > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-yellow-400 shrink-0">
                    <DollarSign className="w-3 h-3" />
                    {draft.price.toFixed(2)}
                  </span>
                )}
              </div>
              {draft.body && (
                <p className="text-xs text-white/35 truncate">{draft.body}</p>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-white/25">
                {draft.scheduled_at && (
                  <span className="flex items-center gap-1 text-cyan-400/70">
                    <Clock className="w-3 h-3" />
                    {new Date(draft.scheduled_at).toLocaleString()}
                  </span>
                )}
                {draft.published_at && (
                  <span>{new Date(draft.published_at).toLocaleDateString()}</span>
                )}
                {draft.media_urls?.length > 0 && (
                  <span>{draft.media_urls.length} media</span>
                )}
                <span>Updated {new Date(draft.updated_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {draft.status !== "published" && (
                <button
                  onClick={() => handlePublish(draft.id)}
                  disabled={isPublishing}
                  title={draft.scheduled_at ? "Schedule on Fanvue" : "Publish now"}
                  className="p-2 rounded-lg text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-40"
                >
                  {isPublishing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              )}
              <Link
                href={`/workspace/${draft.id}`}
                className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => handleDelete(draft.id)}
                disabled={isDeleting}
                className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
