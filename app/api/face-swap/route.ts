import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { DEFAULT_SAFETY_TOLERANCE } from "@/lib/models";

export async function POST(req: NextRequest) {
  try {
    const { sourceImage, targetImage } = await req.json();

    if (!sourceImage || !targetImage) {
      return NextResponse.json(
        { error: "Both sourceImage and targetImage are required." },
        { status: 400 }
      );
    }

    fal.config({ credentials: process.env.FAL_KEY });

    // Use fal.ai face swap model
    const result = await fal.subscribe("fal-ai/face-swap", {
      input: {
        base_image_url: targetImage, // The model/target body image
        swap_image_url: sourceImage, // The user's face to swap in
        safety_tolerance: DEFAULT_SAFETY_TOLERANCE,
      },
    });

    const output = result.data as { image?: { url: string }; images?: { url: string }[] };

    const imageUrl =
      output?.image?.url || (output?.images && output.images[0]?.url);

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image returned from Fal.ai." },
        { status: 500 }
      );
    }

    return NextResponse.json({ imageUrl });
  } catch (err: unknown) {
    console.error("Fal.ai face swap error:", err);
    const message = err instanceof Error ? err.message : "Face swap failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
