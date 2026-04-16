/**
 * Nano Banana Pro (edit) endpoint — fal-hosted.
 *
 * POST /api/nano-banana-pro-edit
 *
 * Body (JSON):
 *   prompt:        string                             (required)
 *   images:        string[]                           (1..4 entries; data URLs or http(s) URLs)
 *   num_images?:   number                             (default 1)
 *   aspect_ratio?: "auto"|"21:9"|"16:9"|"3:2"|"4:3"|"5:4"|"1:1"|"4:5"|"3:4"|"2:3"|"9:16"
 *   output_format?: "png" | "jpeg"                    (default "png")
 *   resolution?:   "1K" | "2K" | "4K"                 (default "1K")
 *
 * Response:
 *   { images: [{ url, contentType, fileName }], description?: string }
 *
 * Docs: https://fal.ai/models/fal-ai/nano-banana-pro/edit/api
 */

import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

import {
  DEFAULT_SAFETY_TOLERANCE,
  FAL_NANO_BANANA_PRO_EDIT_MAX_IMAGES,
  FAL_NANO_BANANA_PRO_EDIT_MODEL,
} from "@/lib/models";

export const runtime = "nodejs";
export const maxDuration = 120;

type AspectRatio =
  | "auto" | "21:9" | "16:9" | "3:2" | "4:3" | "5:4"
  | "1:1"  | "4:5"  | "3:4"  | "2:3" | "9:16";
type Resolution = "1K" | "2K" | "4K";
type OutputFormat = "png" | "jpeg";

interface Body {
  prompt?: string;
  images?: string[];
  num_images?: number;
  aspect_ratio?: AspectRatio;
  output_format?: OutputFormat;
  resolution?: Resolution;
  /** 1 (strictest) – 6 (most permissive). Defaults to DEFAULT_SAFETY_TOLERANCE. */
  safety_tolerance?: number;
}

async function ensurePublicUrl(urlOrDataUrl: string): Promise<string> {
  if (/^https?:\/\//i.test(urlOrDataUrl)) return urlOrDataUrl;
  const match = urlOrDataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) {
    throw new Error("Each image must be an http(s) URL or a data URL with base64.");
  }
  const [, mimeType, data] = match;
  const buffer = Buffer.from(data, "base64");
  const ext = mimeType.split("/")[1] ?? "png";
  const file = new File([new Uint8Array(buffer)], `upload.${ext}`, { type: mimeType });
  return fal.storage.upload(file);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    if (!body.prompt || !body.prompt.trim()) {
      return NextResponse.json({ error: "prompt is required." }, { status: 400 });
    }
    if (!Array.isArray(body.images) || body.images.length === 0) {
      return NextResponse.json(
        { error: "images must be a non-empty array of URLs (data URL or http URL)." },
        { status: 400 }
      );
    }
    if (body.images.length > FAL_NANO_BANANA_PRO_EDIT_MAX_IMAGES) {
      return NextResponse.json(
        { error: `At most ${FAL_NANO_BANANA_PRO_EDIT_MAX_IMAGES} images are allowed.` },
        { status: 400 }
      );
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: "FAL_KEY is not set." }, { status: 500 });
    }
    fal.config({ credentials: process.env.FAL_KEY });

    // Upload any data URLs to fal.storage so we always hand the model public URLs.
    const image_urls = await Promise.all(body.images.map(ensurePublicUrl));

    const result = await fal.subscribe(FAL_NANO_BANANA_PRO_EDIT_MODEL, {
      // Cast to Record so we can pass safety_tolerance, which the fal SDK types
      // don't include in NanoBananaProEditInput but is accepted at the API level.
      input: {
        prompt: body.prompt,
        image_urls,
        safety_tolerance: body.safety_tolerance ?? DEFAULT_SAFETY_TOLERANCE,
        ...(body.num_images != null ? { num_images: body.num_images } : {}),
        ...(body.aspect_ratio ? { aspect_ratio: body.aspect_ratio } : {}),
        ...(body.output_format ? { output_format: body.output_format } : {}),
        ...(body.resolution ? { resolution: body.resolution } : {}),
      } as Record<string, unknown>,
    });

    const output = result.data as {
      images?: { url: string; content_type?: string; file_name?: string }[];
      description?: string;
    };

    if (!output?.images?.length) {
      return NextResponse.json(
        { error: "Nano Banana Pro returned no images." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      images: output.images.map((i) => ({
        url: i.url,
        contentType: i.content_type ?? "image/png",
        fileName: i.file_name,
      })),
      description: output.description,
    });
  } catch (err: unknown) {
    console.error("nano-banana-pro edit error:", err);
    const message = err instanceof Error ? err.message : "Nano Banana Pro edit failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
