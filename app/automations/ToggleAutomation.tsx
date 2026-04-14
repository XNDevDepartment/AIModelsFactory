"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ToggleAutomation({ id, enabled: initial }: { id: string; enabled: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggle = async () => {
    setLoading(true);
    const next = !enabled;
    setEnabled(next);
    await fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative w-10 h-5.5 rounded-full border transition-all duration-200 shrink-0 ${
        enabled
          ? "bg-violet-600 border-violet-500"
          : "bg-white/10 border-white/15"
      } disabled:opacity-40`}
      style={{ height: "22px" }}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
          enabled ? "left-[calc(100%-18px)]" : "left-0.5"
        }`}
      />
    </button>
  );
}
