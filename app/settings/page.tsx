"use client";

import { useState, useEffect } from "react";
import { Settings, Key, RefreshCw, CheckCircle, AlertCircle, Zap, User } from "lucide-react";

interface ConnectionStatus {
  connected: boolean;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  lastSync?: string;
  subscriberCount?: number;
}

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings/fanvue")
      .then((r) => r.json())
      .then((d) => {
        if (d.connected) setStatus(d);
      })
      .catch(() => {});
  }, []);

  const saveKey = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/fanvue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus({ connected: true, ...data });
      setApiKey("");
      setMessage({ type: "success", text: "API key saved and verified!" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save key." });
    } finally {
      setSaving(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/fanvue/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus((prev) => prev ? { ...prev, lastSync: new Date().toISOString(), subscriberCount: data.subscriberCount } : prev);
      setMessage({ type: "success", text: `Synced ${data.subscriberCount} subscribers and ${data.messageCount} chats.` });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Sync failed." });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6 lg:p-10">
      <div className="max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white/60" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Settings</h1>
            <p className="text-sm text-white/40">Connect your Fanvue account and configure the CRM</p>
          </div>
        </div>

        {/* Message banner */}
        {message && (
          <div className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm border ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-red-500/10 border-red-500/20 text-red-300"
          }`}>
            {message.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {message.text}
          </div>
        )}

        {/* Connection status card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">Fanvue Connection</h2>

          {status?.connected ? (
            <div className="flex items-center gap-4 mb-5">
              {status.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={status.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-violet-400" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{status.displayName ?? status.username}</p>
                  <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Connected
                  </span>
                </div>
                <p className="text-sm text-white/40">@{status.username}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-5 text-white/40 text-sm">
              <AlertCircle className="w-4 h-4" />
              No Fanvue account connected yet
            </div>
          )}

          {/* API key input */}
          <div className="space-y-3">
            <label className="text-xs text-white/40 font-medium">
              {status?.connected ? "Update API Key" : "Fanvue API Key"}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4">
                <Key className="w-4 h-4 text-white/30 shrink-0" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveKey()}
                  placeholder="fv_live_••••••••••••••••"
                  className="flex-1 bg-transparent py-3 text-sm placeholder:text-white/20 focus:outline-none"
                />
              </div>
              <button
                onClick={saveKey}
                disabled={!apiKey.trim() || saving}
                className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
            <p className="text-xs text-white/25">
              Get your API key from Fanvue → Settings → Developer API
            </p>
          </div>
        </div>

        {/* Sync card — only shown when connected */}
        {status?.connected && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Data Sync</h2>
                {status.lastSync && (
                  <p className="text-xs text-white/30 mt-1">
                    Last synced: {new Date(status.lastSync).toLocaleString()}
                  </p>
                )}
              </div>
              {status.subscriberCount !== undefined && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-violet-300">{status.subscriberCount}</p>
                  <p className="text-xs text-white/30">subscribers</p>
                </div>
              )}
            </div>
            <button
              onClick={syncNow}
              disabled={syncing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync Now"}
            </button>
          </div>
        )}

        {/* Webhook config */}
        {status?.connected && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Webhook Setup</h2>
            </div>
            <p className="text-sm text-white/50 mb-3">
              Add this URL to your Fanvue developer settings to enable real-time automations:
            </p>
            <div className="bg-black/30 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-violet-300 break-all select-all">
              {typeof window !== "undefined" ? window.location.origin : "https://your-domain.vercel.app"}/api/webhooks/fanvue
            </div>
            <p className="mt-2 text-xs text-white/25">
              Events: new_subscriber · message_received · renewal · churn · tip_received
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
