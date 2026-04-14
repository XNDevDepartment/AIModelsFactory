import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("automations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load automations";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name: string;
      description?: string;
      trigger_type: string;
      actions: unknown[];
      conditions?: unknown[];
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!body.actions || body.actions.length === 0) {
      return NextResponse.json({ error: "At least one action is required" }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data, error } = await db
      .from("automations")
      .insert({
        name: body.name.trim(),
        description: body.description?.trim() ?? undefined,
        trigger_type: body.trigger_type,
        actions: body.actions as import("@/lib/database.types").Json,
        conditions: (body.conditions ?? []) as import("@/lib/database.types").Json,
        enabled: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create automation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
