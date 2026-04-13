import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type GenerationConfig,
  type Part,
} from "@google/generative-ai";

// ─── Safety ──────────────────────────────────────────────────────────────────

const NO_SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ─── Types ───────────────────────────────────────────────────────────────────

export type GeminiModel =
  | "gemini-2.0-flash"
  | "gemini-2.0-flash-lite"
  | "gemini-1.5-pro"
  | "gemini-1.5-flash";

export interface ImageInput {
  /** Raw base64 string or a full data-URL (data:image/...;base64,...) */
  base64: string;
  mimeType?: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

export interface PromptOptions {
  /** Gemini model to use. Defaults to gemini-2.0-flash. */
  model?: GeminiModel;
  /** System instruction prepended before the user prompt. */
  system?: string;
  /** Images to attach to the prompt. */
  images?: ImageInput[];
  /** GenerationConfig overrides (temperature, maxOutputTokens, etc.). */
  generation?: GenerationConfig;
  /** When true, expects the model to return valid JSON and parses it. */
  json?: boolean;
}

// ─── Client factory ───────────────────────────────────────────────────────────

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set.");
  return new GoogleGenerativeAI(key);
}

// ─── Core prompt function ─────────────────────────────────────────────────────

/**
 * Send a prompt to Google Gemini Pro and return the text response.
 *
 * @example
 * const reply = await geminiPrompt("Describe the vibe of street fashion in 2025.");
 *
 * @example — with an image
 * const reply = await geminiPrompt("What is this person wearing?", {
 *   images: [{ base64: myBase64String }],
 * });
 *
 * @example — expect JSON back
 * const data = await geminiPrompt<{ tags: string[] }>(
 *   "Return a JSON object with a 'tags' array describing this outfit.",
 *   { images: [{ base64: myBase64String }], json: true }
 * );
 */
export async function geminiPrompt<T = string>(
  prompt: string,
  options: PromptOptions = {}
): Promise<T> {
  const {
    model: modelId = "gemini-3.1-flash-image-preview",
    system,
    images = [],
    generation,
    json = false,
  } = options;

  const genAI = getClient();

  const model = genAI.getGenerativeModel({
    model: modelId,
    safetySettings: NO_SAFETY,
    ...(system ? { systemInstruction: system } : {}),
    generationConfig: {
      ...(json ? { responseMimeType: "application/json" } : {}),
      ...generation,
    },
  });

  // Build parts: text first, then images
  const parts: Part[] = [{ text: prompt }];

  for (const img of images) {
    const raw = img.base64.replace(/^data:image\/\w+;base64,/, "");
    const mimeMatch = img.base64.match(/^data:(image\/\w+);base64,/);
    const mimeType =
      img.mimeType ?? (mimeMatch?.[1] as ImageInput["mimeType"]) ?? "image/jpeg";

    parts.push({ inlineData: { mimeType, data: raw } });
  }

  const result = await model.generateContent(parts);
  const text = result.response.text().trim();

  if (json) {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Gemini did not return valid JSON.");
    return JSON.parse(jsonMatch[0]) as T;
  }

  return text as unknown as T;
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

/** Plain text prompt — no images. */
export const ask = (prompt: string, options?: Omit<PromptOptions, "images">) =>
  geminiPrompt<string>(prompt, options);

/** Image-aware prompt — attach one or more images alongside text. */
export const askWithImages = (
  prompt: string,
  images: ImageInput[],
  options?: Omit<PromptOptions, "images">
) => geminiPrompt<string>(prompt, { ...options, images });

/** Prompt that always returns a parsed JSON object. */
export const askJSON = <T = unknown>(
  prompt: string,
  options?: Omit<PromptOptions, "json">
) => geminiPrompt<T>(prompt, { ...options, json: true });
