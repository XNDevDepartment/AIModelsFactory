import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { OPENAI_IMAGE_MODEL } from "@/lib/models";

export async function POST(req: NextRequest) {
  try {
    const { sourceImage, targetImage, targetLabel } = await req.json();

    if (!sourceImage) {
      return NextResponse.json({ error: "sourceImage is required." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Convert source base64 → Buffer → File
    const srcBase64 = sourceImage.replace(/^data:image\/\w+;base64,/, "");
    const srcBuffer = Buffer.from(srcBase64, "base64");
    const sourceFile = await toFile(srcBuffer, "source.png", { type: "image/png" });

    let prompt: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let imageInput: any;

    if (targetImage) {
      // Convert target base64 → Buffer → File
      const tgtBase64 = targetImage.replace(/^data:image\/\w+;base64,/, "");
      const tgtBuffer = Buffer.from(tgtBase64, "base64");
      const targetFile = await toFile(tgtBuffer, "target.png", { type: "image/png" });

      prompt =
        "The first image shows a person. The second image is a style reference. " +
        "Completely replace the person's clothing, hairstyle, accessories, makeup, and overall appearance " +
        "to match the style and outfit from the second reference image. " +
        "Keep the same body pose, background, and the person's face unchanged. " +
        "The result should look photorealistic.";
      imageInput = [sourceFile, targetFile];
    } else {
      prompt =
        `Transform this person into a professional ${targetLabel ?? "fashion"} model. ` +
        "Replace their clothing, hairstyle, and overall appearance with a high-end editorial fashion look. " +
        "Keep their face recognizable and maintain the same pose and background.";
      imageInput = sourceFile;
    }

    const response = await openai.images.edit({
      model: OPENAI_IMAGE_MODEL,
      image: imageInput,
      prompt,
      size: "1024x1024",
    });

    const item = response.data?.[0];
    if (!item) throw new Error("No image returned from GPT Image.");
    const imageUrl = item.url ?? `data:image/png;base64,${item.b64_json}`;

    return NextResponse.json({ imageUrl });
  } catch (err: unknown) {
    console.error("Person swap error:", err);
    const message = err instanceof Error ? err.message : "Person swap failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
