import { supabaseAdmin } from "@/lib/supabase";
import { PenSquare, FileText, Send, Clock, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import DraftList from "./DraftList";

export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { value: "all",       label: "All",       icon: FileText },
  { value: "draft",     label: "Drafts",    icon: PenSquare },
  { value: "scheduled", label: "Scheduled", icon: Clock },
  { value: "published", label: "Published", icon: CheckCircle2 },
];

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = status ?? "all";

  const db = supabaseAdmin();
  let query = db
    .from("content_drafts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }

  const { data: drafts } = await query;

  // Stats
  const { data: allDrafts } = await db
    .from("content_drafts")
    .select("status");

  const counts = {
    draft:     allDrafts?.filter((d) => d.status === "draft").length     ?? 0,
    scheduled: allDrafts?.filter((d) => d.status === "scheduled").length ?? 0,
    published: allDrafts?.filter((d) => d.status === "published").length ?? 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <PenSquare className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Workspace</h1>
            <p className="text-sm text-white/40">Create, schedule and publish content to Fanvue</p>
          </div>
        </div>
        <Link
          href="/workspace/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all text-sm font-semibold shadow-lg shadow-violet-500/20"
        >
          <PenSquare className="w-4 h-4" />
          New Draft
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Drafts",    count: counts.draft,     color: "text-white/60",   bg: "bg-white/5" },
          { label: "Scheduled", count: counts.scheduled, color: "text-cyan-300",    bg: "bg-cyan-500/10" },
          { label: "Published", count: counts.published, color: "text-emerald-300", bg: "bg-emerald-500/10" },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`${bg} border border-white/10 rounded-2xl px-5 py-4`}>
            <p className={`text-2xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-white/40 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
        {STATUS_TABS.map(({ value, label }) => (
          <Link
            key={value}
            href={value === "all" ? "/workspace" : `/workspace?status=${value}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeStatus === value
                ? "bg-violet-600 text-white shadow"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {label}
            {value !== "all" && counts[value as keyof typeof counts] > 0 && (
              <span className="ml-1.5 text-xs opacity-70">{counts[value as keyof typeof counts]}</span>
            )}
          </Link>
        ))}
      </div>

      {/* Draft list (client component for delete/publish interactions) */}
      <DraftList
        drafts={drafts ?? []}
        emptyMessage={
          activeStatus === "all"
            ? "No drafts yet — create your first piece of content"
            : `No ${activeStatus} content`
        }
      />

      {/* AI Quick-Create hint */}
      {(drafts?.length ?? 0) === 0 && (
        <div className="mt-6 flex items-center gap-3 bg-violet-500/5 border border-violet-500/15 rounded-2xl px-5 py-4 max-w-lg">
          <Sparkles className="w-5 h-5 text-violet-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-white/80">Use AI to write captions</p>
            <p className="text-xs text-white/40 mt-0.5">When creating a draft, hit the Sparkles button to auto-generate a caption in your voice.</p>
          </div>
        </div>
      )}
    </div>
  );
}
