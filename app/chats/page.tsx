import Link from "next/link";
import { MessageSquare, Search } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import ChatThread from "./ChatThread";

export const dynamic = "force-dynamic";

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ subscriber?: string; chat?: string }>;
}) {
  const params = await searchParams;
  const db = supabaseAdmin();

  // Get recent messages (one per chat, deduplicated)
  const { data: rawMessages } = await db
    .from("messages")
    .select("fanvue_chat_id, subscriber_id, sent_at, direction, content")
    .order("sent_at", { ascending: false })
    .limit(500);

  // De-duplicate by chat ID — keep most recent message per chat
  type ChatEntry = {
    fanvue_chat_id: string;
    subscriber_id: string | null;
    sent_at: string;
    direction: "inbound" | "outbound";
    content: string;
  };
  const seenChats = new Map<string, ChatEntry>();
  for (const msg of rawMessages ?? []) {
    if (!seenChats.has(msg.fanvue_chat_id)) seenChats.set(msg.fanvue_chat_id, msg);
  }
  const chats = Array.from(seenChats.values());

  // Fetch subscriber info for all relevant subscriber_ids
  const subIds = [...new Set(chats.map((c) => c.subscriber_id).filter(Boolean))] as string[];
  const { data: subsRaw } = subIds.length
    ? await db.from("subscribers").select("id, fanvue_id, username, display_name, avatar_url").in("id", subIds)
    : { data: [] };
  const subMap = Object.fromEntries((subsRaw ?? []).map((s) => [s.id, s]));

  // Find active chat
  let activeChatId = params.chat;
  if (!activeChatId && params.subscriber) {
    const found = chats.find((c) => {
      const sub = c.subscriber_id ? subMap[c.subscriber_id] : null;
      return sub?.fanvue_id === params.subscriber;
    });
    activeChatId = found?.fanvue_chat_id;
  }
  if (!activeChatId && chats.length > 0) {
    activeChatId = chats[0].fanvue_chat_id;
  }

  // Load messages for active chat
  const { data: activeMessages } = activeChatId
    ? await db
        .from("messages")
        .select("*")
        .eq("fanvue_chat_id", activeChatId)
        .order("sent_at", { ascending: true })
    : { data: [] };

  const activeChatEntry = activeChatId ? chats.find((c) => c.fanvue_chat_id === activeChatId) : null;
  const activeSub = activeChatEntry?.subscriber_id ? subMap[activeChatEntry.subscriber_id] ?? null : null;

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Sidebar: chat list */}
      <aside className="w-72 border-r border-white/8 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/8">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-violet-400" />
            <h1 className="font-bold text-sm">Chats</h1>
            <span className="ml-auto text-xs text-white/30">{chats.length}</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <Search className="w-3.5 h-3.5 text-white/30" />
            <input placeholder="Search…" className="flex-1 bg-transparent text-xs placeholder:text-white/20 focus:outline-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-6 text-center text-white/25 text-xs">
              No chats yet — sync Fanvue in Settings
            </div>
          ) : (
            chats.map((chat) => {
              const sub = chat.subscriber_id ? subMap[chat.subscriber_id] ?? null : null;
              const isActive = chat.fanvue_chat_id === activeChatId;
              return (
                <Link
                  key={chat.fanvue_chat_id}
                  href={`/chats?chat=${chat.fanvue_chat_id}`}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 transition-all hover:bg-white/5 ${
                    isActive ? "bg-violet-500/10 border-l-2 border-l-violet-500" : ""
                  }`}
                >
                  {sub?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sub.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-300 shrink-0">
                      {sub?.username.charAt(0).toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sub?.display_name ?? sub?.username ?? "Unknown"}</p>
                    <p className="text-xs text-white/30 truncate">
                      {chat.direction === "outbound" ? "You: " : ""}{chat.content || "(media)"}
                    </p>
                  </div>
                  <p className="text-xs text-white/20 shrink-0">
                    {new Date(chat.sent_at).toLocaleDateString()}
                  </p>
                </Link>
              );
            })
          )}
        </div>
      </aside>

      {/* Main: chat thread */}
      {activeChatId ? (
        <ChatThread
          chatId={activeChatId}
          messages={activeMessages ?? []}
          subscriber={activeSub}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/25 text-sm">Select a conversation</p>
          </div>
        </div>
      )}
    </div>
  );
}
