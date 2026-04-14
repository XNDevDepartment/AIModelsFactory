"use client";

import { useState } from "react";
import { Send, Sparkles, DollarSign } from "lucide-react";

interface Message {
  id: string;
  direction: string;
  content: string;
  sent_at: string;
  is_ppv: boolean;
  ppv_price: number | null;
  ppv_unlocked: boolean;
}

interface Subscriber {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function ChatThread({
  chatId,
  messages: initialMessages,
  subscriber,
}: {
  chatId: string;
  messages: Message[];
  subscriber: Subscriber | null;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [ppvMode, setPpvMode] = useState(false);
  const [ppvPrice, setPpvPrice] = useState("9.99");

  const sendMessage = async (content: string, isPpv = false) => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/crm/chats/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          content,
          isPpv,
          ppvPrice: isPpv ? parseFloat(ppvPrice) : undefined,
        }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
        setInput("");
        setPpvMode(false);
      }
    } finally {
      setSending(false);
    }
  };

  const generateAiReply = async () => {
    const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
    if (!lastInbound) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/crm/chats/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: lastInbound.content }),
      });
      if (res.ok) {
        const { suggestion } = await res.json();
        setInput(suggestion);
      }
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/8 bg-white/2">
        {subscriber?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={subscriber.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-300">
            {subscriber?.username?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
        )}
        <div>
          <p className="font-semibold text-sm">{subscriber?.display_name ?? subscriber?.username}</p>
          <p className="text-xs text-white/30">@{subscriber?.username}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-sm px-4 py-2.5 rounded-2xl text-sm ${
                msg.direction === "outbound"
                  ? "bg-violet-600/40 border border-violet-500/20"
                  : "bg-white/8 border border-white/10"
              }`}
            >
              <p className={msg.content ? "" : "text-white/30 italic"}>
                {msg.content || "(media)"}
              </p>
              {msg.is_ppv && (
                <div className="flex items-center gap-1 mt-1.5 text-xs text-fuchsia-300">
                  <DollarSign className="w-3 h-3" />
                  PPV ${msg.ppv_price} · {msg.ppv_unlocked ? "✓ Unlocked" : "Locked"}
                </div>
              )}
              <p className="text-xs text-white/25 mt-1">
                {new Date(msg.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* PPV price input */}
      {ppvMode && (
        <div className="px-6 py-2 border-t border-white/8 flex items-center gap-3 bg-fuchsia-500/5">
          <DollarSign className="w-4 h-4 text-fuchsia-400" />
          <span className="text-sm text-fuchsia-300">PPV Price:</span>
          <input
            type="number"
            value={ppvPrice}
            onChange={(e) => setPpvPrice(e.target.value)}
            min="3"
            step="0.01"
            className="w-24 bg-white/5 border border-fuchsia-500/20 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-fuchsia-500/50"
          />
          <button onClick={() => setPpvMode(false)} className="text-xs text-white/40 hover:text-white ml-auto">
            Cancel
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t border-white/8">
        <div className="flex gap-2">
          <div className="flex-1 flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-violet-500/40 transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input, ppvMode);
                }
              }}
              placeholder="Type a message…"
              rows={1}
              className="flex-1 bg-transparent text-sm placeholder:text-white/20 focus:outline-none resize-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={generateAiReply}
              disabled={aiLoading}
              title="Generate AI reply"
              className="p-3 rounded-xl bg-fuchsia-600/30 hover:bg-fuchsia-600/50 border border-fuchsia-500/20 transition-colors disabled:opacity-40"
            >
              <Sparkles className={`w-4 h-4 text-fuchsia-300 ${aiLoading ? "animate-pulse" : ""}`} />
            </button>
            <button
              onClick={() => sendMessage(input, ppvMode)}
              disabled={!input.trim() || sending}
              className="p-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => setPpvMode(!ppvMode)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg border transition-all ${
              ppvMode ? "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30" : "text-white/30 border-white/10 hover:border-white/20"
            }`}
          >
            <DollarSign className="w-3 h-3" />
            PPV
          </button>
        </div>
      </div>
    </div>
  );
}
