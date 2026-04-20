"use client";

import { useState } from "react";
import {
  MessageCircleHeart,
  Lock,
  Sparkles,
  Send,
  Crown,
  Mic2,
  Images,
  ChevronRight,
  Star,
} from "lucide-react";

const STRIPE_URL = "https://buy.stripe.com/8x2aEY5yM6HSe4u3NN1ck01";

const benefits = [
  {
    icon: MessageCircleHeart,
    title: "Chat with Jessica — for free, all month",
    description:
      "Direct, uncensored conversations with Jessica. Ask her anything. Get real answers. This isn't a chatbot — it's her.",
    color: "from-rose-500 to-pink-600",
    glow: "shadow-rose-500/20",
  },
  {
    icon: Lock,
    title: "Exclusive members-only content",
    description:
      "Content she creates for you and only you. Never posted publicly. Never shared. You get what the internet doesn't.",
    color: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/20",
  },
  {
    icon: Sparkles,
    title: "3 personal content requests",
    description:
      "You tell her exactly what you want. She delivers. Three custom, private, made-for-you pieces — just say the word.",
    color: "from-amber-400 to-orange-500",
    glow: "shadow-amber-400/20",
  },
  {
    icon: Send,
    title: "VIP Telegram channel",
    description:
      "Step inside the circle. An invite-only Telegram group where the real content drops first — before anyone else gets it.",
    color: "from-sky-400 to-blue-500",
    glow: "shadow-sky-400/20",
  },
  {
    icon: Crown,
    title: "Full Fanvue access — 1 month",
    description:
      "Unlock everything she's ever posted. Her complete vault, yours for a full month with no limits and no gatekeeping.",
    color: "from-fuchsia-500 to-pink-500",
    glow: "shadow-fuchsia-500/20",
  },
  {
    icon: Mic2,
    title: "2 private, personal audios",
    description:
      "Her voice. Your name. Two exclusive recordings made personally for you — the kind she doesn't make for anyone else.",
    color: "from-emerald-400 to-teal-500",
    glow: "shadow-emerald-400/20",
  },
  {
    icon: Images,
    title: "Behind-the-scenes gallery",
    description:
      "The raw, unfiltered side of Jessica. Photos and moments she only shows to people she actually lets in.",
    color: "from-rose-400 to-rose-600",
    glow: "shadow-rose-400/20",
  },
];

export default function OfferPage() {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="min-h-screen bg-[#08060f] text-white overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-violet-700/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-rose-600/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-2xl mx-auto px-5 py-16 flex flex-col items-center">

        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-fuchsia-300">
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
        <p className="text-center text-lg text-white/55 leading-relaxed max-w-lg mb-10">
          Most people never get this close to Jessica. You're about to. Everything
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
        <div className="w-full flex items-center gap-4 mb-12">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-xs font-semibold uppercase tracking-widest text-white/25">
            What you unlock
          </span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        {/* Benefits list */}
        <div className="w-full flex flex-col gap-4 mb-14">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className={`group relative rounded-2xl border border-white/6 bg-white/[0.03] p-5 flex gap-4 items-start transition-all duration-300 hover:border-white/12 hover:bg-white/[0.055] hover:shadow-xl ${b.glow}`}
              >
                <div
                  className={`mt-0.5 shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${b.color} flex items-center justify-center shadow-lg`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-white leading-snug mb-1">{b.title}</p>
                  <p className="text-sm text-white/50 leading-relaxed">{b.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Social proof strip */}
        <div className="w-full mb-10 rounded-2xl border border-white/6 bg-white/[0.03] p-6 text-center">
          <p className="text-2xl font-black mb-1 bg-gradient-to-r from-fuchsia-300 to-violet-300 bg-clip-text text-transparent">
            "I didn't expect it to feel this personal."
          </p>
          <p className="text-sm text-white/35">— one of Jessica's members</p>
        </div>

        {/* Urgency note */}
        <p className="text-center text-sm text-white/35 mb-8 max-w-sm leading-relaxed">
          Access is limited. Once the spots fill, this offer closes and the price
          goes up — or disappears entirely.
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

        <p className="mt-5 text-xs text-white/20 text-center">
          Secure checkout via Stripe · Instant access after payment
        </p>
      </div>
    </div>
  );
}
