import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ask } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { type, hint } = await req.json() as { type: string; hint?: string };
    const db = supabaseAdmin();

    const { data: personas } = await db
      .from("ai_personas")
      .select("*")
      .eq("is_default", true)
      .limit(1);

    const persona = personas?.[0];
    const tone = persona?.tone ?? "flirty, confident, warm";
    const system =
      persona?.system_prompt ??
      `You are a content creator writing captions for ${type} posts. Tone: ${tone}. Keep it engaging and authentic.`;

    const typeLabel =
      type === "ppv" ? "exclusive pay-per-view" :
      type === "mass_message" ? "mass message to all subscribers" :
      type === "story" ? "story post" : "regular post";

    const hintText = hint ? `\n\nContext/hint: ${hint}` : "";

    const prompt = `Write a compelling caption for a ${typeLabel} on a creator platform.${hintText}\n\nCaption only — no explanation, no quotes, no hashtags unless natural.`;
    const caption = await ask(prompt, { system });

    return NextResponse.json({ caption: caption.trim() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI caption generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
