"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles, Users, MessageSquare, Zap, LayoutGrid,
  Image as ImageIcon, Settings, Library, ChevronRight,
} from "lucide-react";

const NAV = [
  {
    group: "Create",
    items: [
      { href: "/",          label: "Studio",     icon: Sparkles,      badge: null },
      { href: "/workspace", label: "Workspace",  icon: LayoutGrid,    badge: null },
      { href: "/cms",       label: "Gallery",    icon: ImageIcon,     badge: null },
    ],
  },
  {
    group: "Fanvue CRM",
    items: [
      { href: "/crm",         label: "Subscribers", icon: Users,          badge: null },
      { href: "/chats",       label: "Chats",        icon: MessageSquare,  badge: "live" },
      { href: "/automations", label: "Automations",  icon: Zap,            badge: null },
    ],
  },
  {
    group: "System",
    items: [
      { href: "/settings", label: "Settings", icon: Settings, badge: null },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-slate-950 border-r border-white/8 shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-white">AI Models Factory</p>
            <p className="text-xs text-white/30 leading-tight">Creator Suite</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-6">
        {NAV.map((group) => (
          <div key={group.group}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">
              {group.group}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
                        active
                          ? "bg-violet-500/15 text-white"
                          : "text-white/50 hover:text-white/80 hover:bg-white/5"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-violet-400" : "text-white/40 group-hover:text-white/60"}`} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge === "live" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                      {active && <ChevronRight className="w-3.5 h-3.5 text-violet-400/60" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/8">
        <div className="flex items-center gap-2 text-xs text-white/25">
          <Library className="w-3.5 h-3.5" />
          <span>Powered by Gemini + Fal.ai</span>
        </div>
      </div>
    </aside>
  );
}
