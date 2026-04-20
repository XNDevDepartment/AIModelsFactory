"use client";

import { useState } from "react";
import { Crown, ChevronRight, Star, ShieldCheck } from "lucide-react";

const STRIPE_URL = "https://buy.stripe.com/8x2aEY5yM6HSe4u3NN1ck01";

const benefits = [
  {
    emoji: "💬",
    symbol: "∞",
    label: "Free Chat",
    title: "Chat with Jessica — all month, on you",
    description:
      "Direct, uncensored conversations with Jessica. Ask her anything. Get real answers. This isn't a chatbot — it's her.",
    accent: "#f43f5e",
    bg: "from-rose-500/15 to-pink-600/5",
    border: "border-rose-500/20",
    glow: "hover:shadow-rose-500/15",
    tag: "30 days",
  },
  {
    emoji: "🔒",
    symbol: "✦",
    label: "Exclusive Content",
    title: "Content that never goes public",
    description:
      "Content she creates for you and only you. Never posted publicly. Never shared anywhere. You get what the internet doesn't.",
    accent: "#a855f8",
    bg: "from-violet-500/15 to-purple-600/5",
    border: "border-violet-500/20",
    glow: "hover:shadow-violet-500/15",
    tag: "members only",
  },
  {
    emoji: "✨",
    symbol: "×3",
    label: "Custom Requests",
    title: "3 personal requests — you decide",
    description:
      "You tell her exactly what you want. She delivers. Three custom, private, made-for-you pieces — just say the word.",
    accent: "#f59e0b",
    bg: "from-amber-400/15 to-orange-500/5",
    border: "border-amber-400/20",
    glow: "hover:shadow-amber-400/15",
    tag: "3 requests",
  },
  {
    emoji: "✈️",
    symbol: "⚡",
    label: "VIP Telegram",
    title: "The VIP Telegram channel — invite only",
    description:
      "Step inside the circle. An invite-only Telegram group where the real content drops first — before anyone else sees it.",
    accent: "#38bdf8",
    bg: "from-sky-400/15 to-blue-500/5",
    border: "border-sky-400/20",
    glow: "hover:shadow-sky-400/15",
    tag: "invite only",
  },
  {
    emoji: "👑",
    symbol: "∞",
    label: "Fanvue Vault",
    title: "Full Fanvue access — 1 month, no limits",
    description:
      "Unlock everything she's ever posted. Her complete vault, yours for a full month with zero gatekeeping.",
    accent: "#e879f9",
    bg: "from-fuchsia-500/15 to-pink-500/5",
    border: "border-fuchsia-500/20",
    glow: "hover:shadow-fuchsia-500/15",
    tag: "1 month",
  },
  {
    emoji: "🎙️",
    symbol: "×2",
    label: "Private Audios",
    title: "2 private, personal audios — just for you",
    description:
      "Her voice. Your name. Two exclusive recordings made personally for you — the kind she doesn't make for anyone else.",
    accent: "#34d399",
    bg: "from-emerald-400/15 to-teal-500/5",
    border: "border-emerald-400/20",
    glow: "hover:shadow-emerald-400/15",
    tag: "2 audios",
  },
  {
    emoji: "📸",
    symbol: "★",
    label: "BTS Gallery",
    title: "Behind-the-scenes gallery — raw & unfiltered",
    description:
      "The side of Jessica she doesn't show the world. Photos and moments she only shares with people she actually lets in.",
    accent: "#fb7185",
    bg: "from-rose-400/15 to-rose-600/5",
    border: "border-rose-400/20",
    glow: "hover:shadow-rose-400/15",
    tag: "exclusive",
  },
];

export default function OfferPage() {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="min-h-screen bg-[#08060f] text-white overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none select-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-violet-700/10 rounded-full blur-[150px]" />
        <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-rose-600/7 rounded-full blur-[110px]" />
        {/* Decorative floating symbols */}
        <span className="absolute top-28 left-8 text-5xl opacity-5 rotate-12 select-none">✦</span>
        <span className="absolute top-40 right-10 text-4xl opacity-5 -rotate-6 select-none">★</span>
        <span className="absolute top-1/2 left-4 text-3xl opacity-5 rotate-45 select-none">◆</span>
        <span className="absolute bottom-32 right-8 text-5xl opacity-5 -rotate-12 select-none">✦</span>
      </div>

      <div className="relative max-w-xl mx-auto px-5 py-16 flex flex-col items-center">

        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-fuchsia-300">
          <Star className="w-3 h-3 fill-fuchsia-400 text-fuchsia-400" />
          Limited access — members only
          <Star className="w-3 h-3 fill-fuchsia-400 text-fuchsia-400" />
        </div>

        {/* Headline */}
        <h1 className="text-center text-4xl sm:text-5xl font-black leading-tight tracking-tight mb-5">
          This is your{" "}
          <span className="bg-gradient-to-r from-rose-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
            one shot
          </span>{" "}
          to get inside.
        </h1>

        {/* Subheadline */}
        <p className="text-center text-lg text-white/50 leading-relaxed max-w-lg mb-10">
          Most people never get this close to Jessica. You&apos;re about to. Everything
          below is real, personal, and locked behind this page — and this page only.
        </p>

        {/* CTA — top */}
        <a
          href={STRIPE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="group relative mb-14 inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-500 px-8 py-4 text-base font-bold shadow-2xl shadow-fuchsia-500/30 transition-all duration-300 hover:scale-105 hover:shadow-fuchsia-500/50"
        >
          <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Crown className="w-5 h-5" />
          Grab the offer — get instant access
          <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${hovered ? "translate-x-1" : ""}`} />
        </a>

        {/* Divider */}
        <div className="w-full flex items-center gap-4 mb-10">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">
            Everything you unlock
          </span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        {/* Benefits — grid of icon cards on top */}
        <div className="w-full grid grid-cols-4 gap-3 mb-8">
          {benefits.map((b) => (
            <div
              key={b.label}
              className={`flex flex-col items-center gap-2 rounded-2xl border ${b.border} bg-gradient-to-b ${b.bg} p-3 text-center transition-all duration-300 hover:scale-105`}
            >
              <span className="text-3xl leading-none">{b.emoji}</span>
              <span
                className="text-[10px] font-bold uppercase tracking-wider leading-tight"
                style={{ color: b.accent }}
              >
                {b.label}
              </span>
            </div>
          ))}
          {/* 8th cell — CTA shortcut */}
          <a
            href={STRIPE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-fuchsia-500/30 bg-gradient-to-b from-fuchsia-500/20 to-fuchsia-600/5 p-3 text-center transition-all duration-300 hover:scale-105 hover:border-fuchsia-400/50"
          >
            <span className="text-2xl leading-none">🔓</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-300 leading-tight">
              Get it all
            </span>
          </a>
        </div>

        {/* Benefits — detailed list */}
        <div className="w-full flex flex-col gap-3 mb-14">
          {benefits.map((b) => (
            <div
              key={b.title}
              className={`group relative rounded-2xl border ${b.border} bg-gradient-to-r ${b.bg} px-5 py-4 flex gap-4 items-center transition-all duration-300 hover:border-white/15 hover:shadow-xl ${b.glow}`}
            >
              {/* Big emoji */}
              <div className="shrink-0 w-14 h-14 rounded-2xl bg-black/30 border border-white/8 flex items-center justify-center text-3xl">
                {b.emoji}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-white text-sm leading-snug">{b.title}</p>
                </div>
                <p className="text-xs text-white/45 leading-relaxed">{b.description}</p>
              </div>

              {/* Tag pill */}
              <div
                className="shrink-0 hidden sm:flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border"
                style={{ color: b.accent, borderColor: `${b.accent}33`, backgroundColor: `${b.accent}15` }}
              >
                {b.tag}
              </div>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <div className="w-full mb-4 rounded-2xl border border-white/6 bg-white/[0.03] p-6 flex flex-col items-center gap-3">
          {/* Stars */}
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="text-xl font-black text-center bg-gradient-to-r from-fuchsia-300 to-violet-300 bg-clip-text text-transparent">
            &ldquo;I didn&apos;t expect it to feel this personal.&rdquo;
          </p>
          <p className="text-xs text-white/30">— one of Jessica&apos;s members</p>
        </div>

        {/* Trust badges */}
        <div className="w-full mb-10 grid grid-cols-3 gap-3">
          {[
            { emoji: "🔐", text: "Secure checkout" },
            { emoji: "⚡", text: "Instant access" },
            { emoji: "🔒", text: "Private & discreet" },
          ].map((t) => (
            <div
              key={t.text}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-white/6 bg-white/[0.02] p-3 text-center"
            >
              <span className="text-xl">{t.emoji}</span>
              <span className="text-[11px] text-white/35 font-medium">{t.text}</span>
            </div>
          ))}
        </div>

        {/* Urgency */}
        <p className="text-center text-sm text-white/30 mb-8 max-w-sm leading-relaxed">
          ⏳ Access is limited. Once the spots fill, this offer closes and the
          price goes up — or disappears entirely.
        </p>

        {/* CTA — bottom */}
        <a
          href={STRIPE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group w-full flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-500 px-8 py-4 text-base font-bold shadow-2xl shadow-fuchsia-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-fuchsia-500/50"
        >
          <Crown className="w-5 h-5" />
          Yes, I want in — grab the offer
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
        </a>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-white/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          Secure checkout via Stripe · Instant access after payment
        </div>

      </div>
    </div>
  );
}
