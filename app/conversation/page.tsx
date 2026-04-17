"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Send, Upload, Wand2, Sparkles, Bot, User as UserIcon } from "lucide-react";

import { FAL_NANO_BANANA_PRO_EDIT_MAX_IMAGES, MODEL_CATALOG, type ModelKey } from "@/lib/models";
import type { Attachment, Conversation, ConversationTurn } from "@/lib/conversation";

type Kind = "prompt" | "upload" | "edit";

/**
 * Hard cap shared across all models. Nano Banana Pro is the tightest-bound
 * model we support (max 4 reference images) so we use it as the UI ceiling.
 */
const MAX_ATTACHMENTS = FAL_NANO_BANANA_PRO_EDIT_MAX_IMAGES;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeImage(dataUrl: string, maxPx = 1024, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}

export default function ConversationSimulatorPage() {
  const [model, setModel] = useState<ModelKey>("gemini-nano-banana-2");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [kind, setKind] = useState<Kind>("prompt");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const turns = conversation?.turns.filter((t) => t.role !== "system") ?? [];
  const modelList = useMemo(() => Object.entries(MODEL_CATALOG), []);
  const hasPriorImage = useMemo(
    () => (conversation?.turns ?? []).some((t) => t.images?.length),
    [conversation]
  );

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const slots = Math.max(0, MAX_ATTACHMENTS - attachments.length);
    if (slots === 0) {
      setError(`You can attach at most ${MAX_ATTACHMENTS} images per message.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const accepted = files.slice(0, slots);
    const next: Attachment[] = [];
    for (const f of accepted) {
      const raw = await fileToDataUrl(f);
      const url = await resizeImage(raw);
      next.push({ url, mimeType: "image/jpeg", name: f.name });
    }
    setAttachments((prev) => [...prev, ...next]);
    setKind("upload");
    if (files.length > slots) {
      setError(
        `Only the first ${slots} image${slots === 1 ? "" : "s"} were kept — the limit is ${MAX_ATTACHMENTS}.`
      );
    } else {
      setError(null);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSend() {
    if (!input.trim() && attachments.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const effectiveKind: Kind =
        kind === "edit" && !hasPriorImage ? "prompt"
        : attachments.length > 0 && kind === "prompt" ? "upload"
        : kind;

      // Strip base64 image data from older turns to keep the JSON payload
      // well under Vercel's ~4.5 MB limit. We preserve images only on the
      // two most recent image-bearing turns so the server can still resolve
      // edit targets and provide recent visual context.
      let slimConversation = conversation;
      if (conversation) {
        const MAX_IMAGE_TURNS = 2;
        let imageCount = 0;
        const slimTurns = [...conversation.turns].reverse().map((t) => {
          if (t.images?.length) {
            imageCount++;
            if (imageCount > MAX_IMAGE_TURNS) {
              return { ...t, images: undefined };
            }
          }
          return t;
        }).reverse();
        slimConversation = { ...conversation, turns: slimTurns };
      }

      const res = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation: slimConversation,
          init: conversation ? undefined : { model },
          input: {
            kind: effectiveKind,
            text: input,
            images: attachments,
            model,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setConversation(data.conversation);
      setInput("");
      setAttachments([]);
      setKind("prompt");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function resetConversation() {
    setConversation(null);
    setInput("");
    setAttachments([]);
    setKind("prompt");
    setError(null);
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">AI Conversation Simulator</h1>
            <p className="text-sm text-neutral-400">
              Prompt, upload images, and request edits across the latest generation of image &amp; text models.
            </p>
          </div>
          <button
            onClick={resetConversation}
            className="rounded-lg border border-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-900"
          >
            New chat
          </button>
        </header>

        <section className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
          <span className="text-sm text-neutral-400">Model:</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as ModelKey)}
            disabled={!!conversation}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm disabled:opacity-60"
          >
            {modelList.map(([key, m]) => (
              <option key={key} value={key}>
                {m.label} ({m.id})
              </option>
            ))}
          </select>
          {conversation && (
            <span className="text-xs text-neutral-500">
              Locked for this session — start a new chat to switch.
            </span>
          )}
        </section>

        <section className="min-h-[380px] flex-1 space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/30 p-4">
          {turns.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-neutral-500">
              <Sparkles className="h-6 w-6" />
              <p className="text-sm">
                Start by sending a prompt, or upload an image to ask about / edit it.
              </p>
            </div>
          ) : (
            turns.map((t) => <TurnBubble key={t.id} turn={t} />)
          )}
        </section>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {attachments.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="shrink-0 text-xs text-neutral-500">
              {attachments.length}/{MAX_ATTACHMENTS}
            </span>
            {attachments.map((a, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-md border border-neutral-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.name ?? `upload-${i}`} className="h-full w-full object-cover" />
                <button
                  onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 rounded bg-black/70 px-1 text-xs"
                  aria-label="Remove attachment"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        <footer className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
          <div className="mb-2 flex gap-2">
            <KindPill active={kind === "prompt"} onClick={() => setKind("prompt")} icon={<Sparkles className="h-3.5 w-3.5" />} label="Prompt" />
            <KindPill active={kind === "upload"} onClick={() => setKind("upload")} icon={<Upload className="h-3.5 w-3.5" />} label="Upload" />
            <KindPill
              active={kind === "edit"}
              onClick={() => setKind("edit")}
              icon={<Wand2 className="h-3.5 w-3.5" />}
              label="Edit last image"
              disabled={!hasPriorImage}
            />
          </div>
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={attachments.length >= MAX_ATTACHMENTS}
              className="rounded-lg border border-neutral-700 p-2 hover:bg-neutral-800 disabled:opacity-40"
              title={`Upload image(s) — up to ${MAX_ATTACHMENTS}`}
            >
              <Upload className="h-4 w-4" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                kind === "edit"
                  ? "Describe the edit (e.g. 'make the background a sunset and add a red scarf')…"
                  : kind === "upload"
                  ? "Describe what you want to do with the uploaded image(s)…"
                  : "Send a prompt…"
              }
              rows={2}
              className="flex-1 resize-none rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={busy || (!input.trim() && attachments.length === 0)}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {busy ? "…" : <Send className="h-4 w-4" />}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function KindPill({
  active, onClick, icon, label, disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
        active
          ? "border-white bg-white text-black"
          : "border-neutral-700 text-neutral-300 hover:bg-neutral-800"
      } disabled:opacity-40`}
    >
      {icon}
      {label}
    </button>
  );
}

function TurnBubble({ turn }: { turn: ConversationTurn }) {
  const isUser = turn.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-800">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div
        className={`max-w-[75%] space-y-2 rounded-2xl px-3 py-2 text-sm ${
          isUser ? "bg-white text-black" : "bg-neutral-800 text-neutral-100"
        }`}
      >
        {turn.kind && turn.role === "user" && (
          <div className="text-[10px] uppercase opacity-60">{turn.kind}</div>
        )}
        {turn.text && <p className="whitespace-pre-wrap">{turn.text}</p>}
        {turn.images?.length ? (
          <div className="grid grid-cols-2 gap-2">
            {turn.images.map((img, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-md">
                <Image
                  src={img.url}
                  alt={img.name ?? `image-${i}`}
                  fill
                  sizes="256px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>
        ) : null}
        {turn.role === "assistant" && turn.model && (
          <div className="text-[10px] opacity-50">via {MODEL_CATALOG[turn.model]?.label ?? turn.model}</div>
        )}
      </div>
      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-black">
          <UserIcon className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
