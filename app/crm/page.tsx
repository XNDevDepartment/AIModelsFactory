import Link from "next/link";
import { Users, Search, Tag, MessageSquare, DollarSign, TrendingUp } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function statusColor(status: string) {
  switch (status) {
    case "active":    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
    case "expired":   return "bg-yellow-500/15 text-yellow-300 border-yellow-500/20";
    case "cancelled": return "bg-red-500/15 text-red-300 border-red-500/20";
    default:          return "bg-white/10 text-white/40 border-white/10";
  }
}

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const db = supabaseAdmin();

  let query = db
    .from("subscribers")
    .select("*")
    .order("subscribed_at", { ascending: false });

  if (params.q) {
    query = query.or(`username.ilike.%${params.q}%,display_name.ilike.%${params.q}%`);
  }
  if (params.status) {
    query = query.eq("status", params.status);
  }
  if (params.tag) {
    query = query.contains("tags", [params.tag]);
  }

  const { data: subscribersRaw } = await query.limit(100);
  const subscribers = subscribersRaw ?? [];

  // Stats
  const { count: total } = await db.from("subscribers").select("*", { count: "exact", head: true });
  const { count: active } = await db.from("subscribers").select("*", { count: "exact", head: true }).eq("status", "active");
  const { data: revenue } = await db.from("subscribers").select("total_spent");
  const totalRevenue = revenue?.reduce((s, r) => s + (r.total_spent ?? 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Subscribers</h1>
          <p className="text-sm text-white/40">Manage your Fanvue subscriber base</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Subscribers", value: total ?? 0, icon: Users, color: "text-violet-400" },
          { label: "Active", value: active ?? 0, icon: TrendingUp, color: "text-emerald-400" },
          { label: "Total Revenue", value: `$${totalRevenue.toFixed(0)}`, icon: DollarSign, color: "text-fuchsia-400" },
          { label: "Avg. Spend", value: total ? `$${(totalRevenue / total).toFixed(0)}` : "$0", icon: Tag, color: "text-cyan-400" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/40 font-medium">{stat.label}</p>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <form className="flex-1 min-w-48 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
          <Search className="w-4 h-4 text-white/30 shrink-0" />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search subscribers…"
            className="flex-1 bg-transparent text-sm placeholder:text-white/20 focus:outline-none"
          />
        </form>
        <div className="flex gap-2">
          {["all", "active", "expired", "cancelled"].map((s) => (
            <Link
              key={s}
              href={s === "all" ? "/crm" : `/crm?status=${s}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                (params.status ?? "all") === s
                  ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                  : "bg-white/5 text-white/40 border-white/10 hover:border-white/20"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      {/* Subscriber table */}
      {subscribers.length === 0 ? (
        <div className="text-center py-24">
          <Users className="w-10 h-10 text-white/15 mx-auto mb-3" />
          <p className="text-white/30 text-sm">No subscribers yet — connect Fanvue and sync in Settings</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-white/40 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-semibold">Subscriber</th>
                  <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Tier</th>
                  <th className="text-left px-5 py-3 font-semibold hidden lg:table-cell">Joined</th>
                  <th className="text-left px-5 py-3 font-semibold">Spent</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Tags</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub) => (
                  <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {sub.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sub.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-violet-300">
                            {sub.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-white">{sub.display_name ?? sub.username}</p>
                          <p className="text-white/40 text-xs">@{sub.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-white/50 hidden md:table-cell">
                      {sub.subscription_tier ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-white/40 text-xs hidden lg:table-cell">
                      {sub.subscribed_at ? new Date(sub.subscribed_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3 font-semibold text-fuchsia-300">
                      ${(sub.total_spent ?? 0).toFixed(0)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs border capitalize ${statusColor(sub.status)}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(sub.tags ?? []).slice(0, 3).map((tag: string) => (
                          <span key={tag} className="px-1.5 py-0.5 rounded text-xs bg-white/8 text-white/50">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/crm/${sub.id}`} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                          <Tag className="w-3.5 h-3.5" />
                        </Link>
                        <Link href={`/chats?subscriber=${sub.fanvue_id}`} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
