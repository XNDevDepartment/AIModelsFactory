/**
 * Central registry of the latest model IDs used across the app.
 *
 * Keep this file as the single source of truth for model versions so we never
 * have to grep through route handlers again when a new version drops.
 */

// ─── Google Gemini ───────────────────────────────────────────────────────────

/**
 * Gemini "Nano Banana 2" (a.k.a. Gemini 3 Pro Image) — Google's latest
 * image-generation + editing model. Supersedes `gemini-2.5-flash-image`
 * ("Nano Banana") and the interim `gemini-3.1-flash-image-preview`.
 *
 * Supports: text-to-image, multi-turn image edits, image+text reasoning,
 * multiple reference images, transparent backgrounds, text rendering.
 */
export const GEMINI_IMAGE_MODEL = "gemini-3-pro-image-preview" as const;

/**
 * Gemini 3 Pro — latest general-purpose multimodal text model.
 * Use for reasoning, vision understanding (no image generation), JSON output.
 */
export const GEMINI_TEXT_MODEL = "gemini-3-pro" as const;

// ─── OpenAI ──────────────────────────────────────────────────────────────────

/**
 * OpenAI's native image model (`gpt-image-1`). Used via `openai.images.generate`
 * and `openai.images.edit`. Supports multi-image references and inpainting masks.
 *
 * Note: `gpt-image-2` was never released publicly — early branding materials
 * used that name but the shipping model ID remains `gpt-image-1`. Keep this
 * constant pointed at the real ID; the user-facing label "OpenAI Image 2" is
 * kept in MODEL_CATALOG.
 */
export const OPENAI_IMAGE_MODEL = "gpt-image-1" as const;

/**
 * Latest GPT text model for chat / reasoning. Supports vision input.
 */
export const OPENAI_TEXT_MODEL = "gpt-5.1" as const;

// ─── Fal.ai ──────────────────────────────────────────────────────────────────

export const FAL_FACE_SWAP_MODEL = "fal-ai/face-swap" as const;
export const FAL_MOTION_CONTROL_MODEL =
  "fal-ai/kling-video/v2.6/pro/motion-control" as const;

/**
 * Fal-hosted Google Nano Banana Pro (edit). Accepts 1–4 input image URLs
 * plus a prompt and returns edited image(s).
 *
 * Docs: https://fal.ai/models/fal-ai/nano-banana-pro/edit/api
 */
export const FAL_NANO_BANANA_PRO_EDIT_MODEL = "fal-ai/nano-banana-pro/edit" as const;

/** Maximum reference images accepted by Nano Banana Pro edit. */
export const FAL_NANO_BANANA_PRO_EDIT_MAX_IMAGES = 4;

/**
 * Default `safety_tolerance` applied to every fal.ai request.
 * 6 is the most permissive setting on the 1–6 scale — only truly disallowed
 * content is blocked. Callers can override per-request if they need stricter
 * moderation.
 */
export const DEFAULT_SAFETY_TOLERANCE = 6;

// ─── Catalog (consumed by the conversation simulator) ────────────────────────

export type ModelCapability = "text" | "image-gen" | "image-edit" | "vision";

export interface ModelDescriptor {
  id: string;
  label: string;
  provider: "google" | "openai" | "fal";
  capabilities: ModelCapability[];
  /** Human-readable aliases / codenames. */
  aliases?: string[];
}

export const MODEL_CATALOG: Record<string, ModelDescriptor> = {
  "gemini-nano-banana-2": {
    id: GEMINI_IMAGE_MODEL,
    label: "Gemini Nano Banana 2",
    provider: "google",
    capabilities: ["text", "image-gen", "image-edit", "vision"],
    aliases: ["nano-banana-pro", "gemini-3-pro-image"],
  },
  "gemini-3-pro": {
    id: GEMINI_TEXT_MODEL,
    label: "Gemini 3 Pro",
    provider: "google",
    capabilities: ["text", "vision"],
  },
  "openai-image-2": {
    id: OPENAI_IMAGE_MODEL,
    label: "OpenAI Image 2",
    provider: "openai",
    capabilities: ["image-gen", "image-edit"],
    aliases: ["gpt-image-1"],
  },
  "gpt-5.1": {
    id: OPENAI_TEXT_MODEL,
    label: "GPT-5.1",
    provider: "openai",
    capabilities: ["text", "vision"],
  },
  "nano-banana-pro-fal": {
    id: FAL_NANO_BANANA_PRO_EDIT_MODEL,
    label: "Nano Banana Pro (fal.ai, edit)",
    provider: "fal",
    capabilities: ["image-gen", "image-edit"],
    aliases: ["fal-nano-banana-pro-edit"],
  },
};

export type ModelKey = keyof typeof MODEL_CATALOG;

export function resolveModel(key: ModelKey): ModelDescriptor {
  const m = MODEL_CATALOG[key];
  if (!m) throw new Error(`Unknown model key: ${key}`);
  return m;
}
