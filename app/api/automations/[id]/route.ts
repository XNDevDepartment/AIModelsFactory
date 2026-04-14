import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = supabaseAdmin();
    const { data, error } = await db.from("automations").select("*").eq("id", id).single();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load automation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      name?: string;
      description?: string;
      trigger_type?: string;
      actions?: unknown[];
      conditions?: unknown[];
      enabled?: boolean;
    };

    const db = supabaseAdmin();
    const { data, error } = await db
      .from("automations")
      .update({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.trigger_type !== undefined && { trigger_type: body.trigger_type }),
        ...(body.actions !== undefined && { actions: body.actions as import("@/lib/database.types").Json }),
        ...(body.conditions !== undefined && { conditions: body.conditions as import("@/lib/database.types").Json }),
        ...(body.enabled !== undefined && { enabled: body.enabled }),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update automation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = supabaseAdmin();
    const { error } = await db.from("automations").delete().eq("id", id);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete automation";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
