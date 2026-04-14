import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ask } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json() as { message: string };
    const db = supabaseAdmin();

    const { data: personas } = await db.from("ai_personas").select("*").eq("is_default", true).limit(1);
    const persona = personas?.[0];
    const system = persona?.system_prompt ?? "You are a friendly content creator replying to fans. Keep replies warm and concise (1-2 sentences).";

    const suggestion = await ask(`Fan message: "${message}"\n\nWrite a reply:`, { system });
    return NextResponse.json({ suggestion });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI suggest failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
