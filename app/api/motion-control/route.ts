import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { DEFAULT_SAFETY_TOLERANCE } from "@/lib/models";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const videoFile  = formData.get("video")    as File   | null;
    // Image may arrive as a File upload (standalone module) or as a public URL (face-swap flow).
    const imageFile  = formData.get("image")    as File   | null;
    const imageUrl   = formData.get("imageUrl") as string | null;

    const prompt          = (formData.get("prompt")          as string | null) ?? "";
    const negativePrompt  = (formData.get("negative_prompt") as string | null) ?? "";
    const cfgScaleRaw     = formData.get("cfg_scale")  as string | null;
    const durationRaw     = formData.get("duration")   as string | null;

    if (!videoFile) {
      return NextResponse.json({ error: "video file is required." }, { status: 400 });
    }
    if (!imageFile && !imageUrl) {
      return NextResponse.json(
        { error: "Either an image file or imageUrl is required." },
        { status: 400 }
      );
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: "FAL_KEY is not set." }, { status: 500 });
    }
    fal.config({ credentials: process.env.FAL_KEY });

    // Upload video and (if provided as a file) image to fal.storage in parallel.
    const [resolvedVideoUrl, resolvedImageUrl] = await Promise.all([
      fal.storage.upload(videoFile),
      imageFile ? fal.storage.upload(imageFile) : Promise.resolve(imageUrl!),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (fal as any).subscribe("fal-ai/kling-video/v2.6/pro/motion-control", {
      input: {
        image_url:            resolvedImageUrl,
        video_url:            resolvedVideoUrl,
        character_orientation: "video",
        safety_tolerance:     DEFAULT_SAFETY_TOLERANCE,
        ...(prompt          ? { prompt }                                 : {}),
        ...(negativePrompt  ? { negative_prompt: negativePrompt }        : {}),
        ...(cfgScaleRaw     ? { cfg_scale: parseFloat(cfgScaleRaw) }     : {}),
        ...(durationRaw     ? { duration:  parseInt(durationRaw, 10) }   : {}),
      },
    });

    const output = result.data as {
      video?: { url: string };
      videos?: { url: string }[];
    };

    const generatedVideoUrl =
      output?.video?.url || (output?.videos && output.videos[0]?.url);

    if (!generatedVideoUrl) {
      return NextResponse.json({ error: "No video returned from Fal.ai." }, { status: 500 });
    }

    return NextResponse.json({ videoUrl: generatedVideoUrl });
  } catch (err: unknown) {
    console.error("Motion control error:", err);
    const message = err instanceof Error ? err.message : "Motion control failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
