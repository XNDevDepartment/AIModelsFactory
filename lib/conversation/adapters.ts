/**
 * Provider adapters used by the conversation simulator.
 *
 * Each adapter takes the normalized conversation history plus the current
 * user turn and returns the assistant reply. Adapters handle provider-specific
 * payload shaping, multi-image input, and image edits.
 */

import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  type Content,
  type Part,
} from "@google/generative-ai";
import OpenAI, { toFile } from "openai";
import { fal } from "@fal-ai/client";

import {
  DEFAULT_SAFETY_TOLERANCE,
  FAL_NANO_BANANA_PRO_EDIT_MAX_IMAGES,
  FAL_NANO_BANANA_PRO_EDIT_MODEL,
  GEMINI_IMAGE_MODEL,
  GEMINI_TEXT_MODEL,
  MODEL_CATALOG,
  OPENAI_IMAGE_MODEL,
  OPENAI_TEXT_MODEL,
  type ModelKey,
} from "@/lib/models";

import type { Attachment, ConversationTurn, SendMessageInput } from "./types";

const NO_SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export interface AdapterReply {
  text?: string;
  images?: Attachment[];
}

export interface AdapterContext {
  /** Prior conversation, oldest first. */
  history: ConversationTurn[];
  /** The current user turn being sent. */
  input: SendMessageInput;
  /** Image referenced by an "edit" turn (if any). */
  editTarget?: Attachment;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitDataUrl(url: string): { mimeType: string; data: string } {
  const match = url.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) {
    return { mimeType: "image/png", data: url };
  }
  return { mimeType: match[1], data: match[2] };
}

async function fetchAsBuffer(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (url.startsWith("data:")) {
    const { mimeType, data } = splitDataUrl(url);
    return { buffer: Buffer.from(data, "base64"), mimeType };
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const mimeType = res.headers.get("content-type") ?? "image/png";
  return { buffer: Buffer.from(await res.arrayBuffer()), mimeType };
}

// ─── Gemini adapter ───────────────────────────────────────────────────────────

function geminiPartsFromTurn(turn: ConversationTurn): Part[] {
  const parts: Part[] = [];
  if (turn.text) parts.push({ text: turn.text });
  for (const img of turn.images ?? []) {
    const { mimeType, data } = splitDataUrl(img.url);
    parts.push({ inlineData: { mimeType, data } });
  }
  return parts;
}

export async function runGemini(ctx: AdapterContext, key: ModelKey): Promise<AdapterReply> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");

  const isImageModel = key === "gemini-nano-banana-2";
  const modelId = isImageModel ? GEMINI_IMAGE_MODEL : GEMINI_TEXT_MODEL;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    safetySettings: NO_SAFETY,
    // Image-capable models need IMAGE in responseModalities to actually emit pixels.
    ...(isImageModel
      ? {
          // @ts-expect-error responseModalities is supported at runtime.
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }
      : {}),
  });

  // Build contents: full history + current turn.
  const contents: Content[] = ctx.history.map((t) => ({
    role: t.role === "assistant" ? "model" : "user",
    parts: geminiPartsFromTurn(t),
  }));

  const currentParts: Part[] = [];
  const { input, editTarget } = ctx;

  if (input.kind === "edit") {
    // Reference the edit target explicitly — image first for clarity.
    if (editTarget) {
      const { mimeType, data } = splitDataUrl(editTarget.url);
      currentParts.push({ inlineData: { mimeType, data } });
    }
    currentParts.push({
      text: `Edit the attached image as follows: ${input.text}. Return the edited image.`,
    });
  } else {
    if (input.text) currentParts.push({ text: input.text });
  }
  for (const img of input.images ?? []) {
    const { mimeType, data } = splitDataUrl(img.url);
    currentParts.push({ inlineData: { mimeType, data } });
  }

  contents.push({ role: "user", parts: currentParts });

  const result = await model.generateContent({ contents });

  const responseParts = result.response.candidates?.[0]?.content?.parts ?? [];
  const reply: AdapterReply = { images: [] };
  for (const p of responseParts) {
    if ("text" in p && typeof p.text === "string" && p.text.trim()) {
      reply.text = (reply.text ? reply.text + "\n" : "") + p.text.trim();
    }
    if (
      "inlineData" in p &&
      p.inlineData?.data &&
      p.inlineData.mimeType?.startsWith("image/")
    ) {
      reply.images!.push({
        url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`,
        mimeType: p.inlineData.mimeType,
      });
    }
  }
  if (!reply.images?.length) delete reply.images;
  return reply;
}

// ─── OpenAI adapter ───────────────────────────────────────────────────────────

export async function runOpenAI(ctx: AdapterContext, key: ModelKey): Promise<AdapterReply> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
  const openai = new OpenAI({ apiKey });

  const { input, editTarget, history } = ctx;
  const isImageModel = key === "openai-image-2";

  if (isImageModel) {
    // ── OpenAI Image 2 ──
    // Collect all referenced images: explicit edit target + current attachments.
    const refImages: Attachment[] = [];
    if (editTarget) refImages.push(editTarget);
    if (input.images?.length) refImages.push(...input.images);

    if (input.kind === "edit" || refImages.length > 0) {
      // openai.images.edit accepts a File or File[] as `image`.
      const files = await Promise.all(
        refImages.map(async (img, i) => {
          const { buffer, mimeType } = await fetchAsBuffer(img.url);
          const ext = mimeType.split("/")[1] ?? "png";
          return toFile(buffer, `ref-${i}.${ext}`, { type: mimeType });
        })
      );
      const response = await openai.images.edit({
        model: OPENAI_IMAGE_MODEL,
        image: files.length === 1 ? files[0] : files,
        prompt: input.text,
        size: "1024x1024",
      });
      const item = response.data?.[0];
      if (!item) throw new Error("OpenAI Image 2 returned no image.");
      const url = item.url ?? `data:image/png;base64,${item.b64_json}`;
      return { images: [{ url, mimeType: "image/png" }] };
    }

    // No images supplied → straight text-to-image.
    const response = await openai.images.generate({
      model: OPENAI_IMAGE_MODEL,
      prompt: input.text,
      size: "1024x1024",
    });
    const item = response.data?.[0];
    if (!item) throw new Error("OpenAI Image 2 returned no image.");
    const url = item.url ?? `data:image/png;base64,${item.b64_json}`;
    return { images: [{ url, mimeType: "image/png" }] };
  }

  // ── GPT text / vision via chat.completions ──
  type ChatContent =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };
  type ChatMsg = { role: "user" | "assistant" | "system"; content: string | ChatContent[] };

  const messages: ChatMsg[] = history.map((t) => {
    const parts: ChatContent[] = [];
    if (t.text) parts.push({ type: "text", text: t.text });
    for (const img of t.images ?? []) parts.push({ type: "image_url", image_url: { url: img.url } });
    return {
      role: t.role === "system" ? "system" : t.role,
      content: parts.length === 1 && parts[0].type === "text" ? parts[0].text : parts,
    };
  });

  const currentParts: ChatContent[] = [];
  if (input.kind === "edit" && editTarget) {
    currentParts.push({ type: "text", text: `Describe the edit you would apply to this image: ${input.text}` });
    currentParts.push({ type: "image_url", image_url: { url: editTarget.url } });
  } else if (input.text) {
    currentParts.push({ type: "text", text: input.text });
  }
  for (const img of input.images ?? []) currentParts.push({ type: "image_url", image_url: { url: img.url } });
  messages.push({
    role: "user",
    content: currentParts.length === 1 && currentParts[0].type === "text" ? currentParts[0].text : currentParts,
  });

  const completion = await openai.chat.completions.create({
    model: OPENAI_TEXT_MODEL,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: messages as any,
  });
  const text = completion.choices[0]?.message?.content ?? "";
  return { text: typeof text === "string" ? text : JSON.stringify(text) };
}

// ─── Fal adapter (Nano Banana Pro edit) ──────────────────────────────────────

async function uploadToFalStorage(att: Attachment): Promise<string> {
  if (/^https?:\/\//i.test(att.url)) return att.url;
  const { buffer, mimeType } = await fetchAsBuffer(att.url);
  const ext = mimeType.split("/")[1] ?? "png";
  const file = new File([new Uint8Array(buffer)], att.name ?? `upload.${ext}`, {
    type: mimeType,
  });
  return fal.storage.upload(file);
}

export async function runFal(ctx: AdapterContext, key: ModelKey): Promise<AdapterReply> {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY is not set.");
  fal.config({ credentials: process.env.FAL_KEY });

  const { input, editTarget, history } = ctx;

  if (key !== "nano-banana-pro-fal") {
    throw new Error(`No Fal adapter configured for model: ${key}`);
  }

  // Collect reference images: explicit edit target, then this turn's uploads,
  // then — as a last resort — the most recent images anywhere in the history,
  // so a "prompt" turn can still carry over a thread of edits.
  const refs: Attachment[] = [];
  if (editTarget) refs.push(editTarget);
  if (input.images?.length) refs.push(...input.images);
  if (refs.length === 0) {
    for (let i = history.length - 1; i >= 0 && refs.length === 0; i--) {
      if (history[i].images?.length) refs.push(...history[i].images!);
    }
  }
  if (refs.length === 0) {
    throw new Error(
      "Nano Banana Pro requires at least one reference image. Upload an image first."
    );
  }
  if (refs.length > FAL_NANO_BANANA_PRO_EDIT_MAX_IMAGES) {
    throw new Error(
      `Nano Banana Pro accepts at most ${FAL_NANO_BANANA_PRO_EDIT_MAX_IMAGES} images per request.`
    );
  }

  const image_urls = await Promise.all(refs.map(uploadToFalStorage));

  const result = await fal.subscribe(FAL_NANO_BANANA_PRO_EDIT_MODEL, {
    input: {
      prompt: input.text,
      image_urls,
      safety_tolerance: DEFAULT_SAFETY_TOLERANCE,
    },
  });

  const output = result.data as {
    images?: { url: string; content_type?: string }[];
    description?: string;
  };
  const images: Attachment[] = (output?.images ?? []).map((i) => ({
    url: i.url,
    mimeType: i.content_type ?? "image/png",
  }));
  if (!images.length) throw new Error("Nano Banana Pro returned no images.");

  return { text: output.description, images };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function runAdapter(key: ModelKey, ctx: AdapterContext): Promise<AdapterReply> {
  const descriptor = MODEL_CATALOG[key];
  if (!descriptor) throw new Error(`Unknown model: ${key}`);
  switch (descriptor.provider) {
    case "google":
      return runGemini(ctx, key);
    case "openai":
      return runOpenAI(ctx, key);
    case "fal":
      return runFal(ctx, key);
    default:
      throw new Error(`No adapter registered for provider: ${descriptor.provider}`);
  }
}
