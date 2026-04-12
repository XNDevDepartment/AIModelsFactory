import { NextRequest, NextResponse } from "next/server";
import { askJSON } from "@/lib/gemini";

interface AnalysisResult {
  description: string;
  modelStyle: string;
  suggestions: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 is required." }, { status: 400 });
    }

    const analysis = await askJSON<AnalysisResult>(
      `You are a professional fashion and model photography analyst.
Analyze this photo of a person and respond with a JSON object with these exact fields:
{
  "description": "A short 1-2 sentence description of the person's appearance, lighting, and mood in the photo.",
  "modelStyle": "Describe what kind of professional model style suits this person best (e.g., editorial, commercial, fitness, fashion week, etc.) and why.",
  "suggestions": ["Tip 1 for better model photos", "Tip 2", "Tip 3"]
}`,
      { images: [{ base64: imageBase64 }] }
    );

    return NextResponse.json(analysis);
  } catch (err: unknown) {
    console.error("Gemini analysis error:", err);
    const message = err instanceof Error ? err.message : "Gemini analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
