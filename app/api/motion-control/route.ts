import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { DEFAULT_SAFETY_TOLERANCE } from "@/lib/models";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const videoFile = formData.get("video") as File | null;
    const imageUrl = formData.get("imageUrl") as string | null;
    const prompt = (formData.get("prompt") as string | null) ?? "";

    if (!videoFile || !imageUrl) {
      return NextResponse.json(
        { error: "Both video and imageUrl are required." },
        { status: 400 }
      );
    }

    fal.config({ credentials: process.env.FAL_KEY });

    // Upload the reference video to fal.ai storage to get a public URL
    const videoUrl = await fal.storage.upload(videoFile);

    // Call Kling v2.6 Pro motion control
    const result = await fal.subscribe("fal-ai/kling-video/v2.6/pro/motion-control", {
      input: {
        image_url: imageUrl,
        video_url: videoUrl,
        character_orientation: "video",
        safety_tolerance: DEFAULT_SAFETY_TOLERANCE,
        ...(prompt ? { prompt } : {}),
      },
    });

    const output = result.data as {
      video?: { url: string };
      videos?: { url: string }[];
    };

    const generatedVideoUrl =
      output?.video?.url ||
      (output?.videos && output.videos[0]?.url);

    if (!generatedVideoUrl) {
      return NextResponse.json(
        { error: "No video returned from Fal.ai." },
        { status: 500 }
      );
    }

    return NextResponse.json({ videoUrl: generatedVideoUrl });
  } catch (err: unknown) {
    console.error("Motion control error:", err);
    const message = err instanceof Error ? err.message : "Motion control failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
