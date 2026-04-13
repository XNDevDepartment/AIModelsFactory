import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, prompt } = await req.json();

    if (!imageBase64 || !prompt) {
      return NextResponse.json({ error: "imageBase64 and prompt are required." }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-image-preview",
      // @ts-expect-error responseModalities supported at runtime but not in older type definitions
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      safetySettings: SAFETY_SETTINGS,
    });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = (mimeMatch?.[1] ?? "image/jpeg") as
      | "image/jpeg"
      | "image/png"
      | "image/webp";

    const result = await model.generateContent([
      {
        text: `You are a professional image editor. Edit this photo of a person as follows: ${prompt}. Keep the person clearly recognizable. Return only the edited image.`,
      },
      { inlineData: { mimeType, data: base64Data } },
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = result.response.candidates?.[0]?.content?.parts ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));

    if (!imagePart?.inlineData) {
      return NextResponse.json(
        { error: "Gemini did not return an edited image. The model may not support image generation for this key." },
        { status: 500 }
      );
    }

    const resultBase64 = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    return NextResponse.json({ imageUrl: resultBase64 });
  } catch (err: unknown) {
    console.error("Gemini edit error:", err);
    const message = err instanceof Error ? err.message : "Gemini image edit failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
