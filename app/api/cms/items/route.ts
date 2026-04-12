import { NextRequest, NextResponse } from "next/server";
import { readManifest, writeManifest } from "@/lib/cms";

export async function GET() {
  try {
    const manifest = await readManifest();
    return NextResponse.json(manifest.items);
  } catch (err: unknown) {
    console.error("CMS items GET error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch items.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id query param is required." }, { status: 400 });
    }

    const manifest = await readManifest();
    const before = manifest.items.length;
    manifest.items = manifest.items.filter((item) => item.id !== id);

    if (manifest.items.length === before) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    await writeManifest(manifest);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("CMS items DELETE error:", err);
    const message = err instanceof Error ? err.message : "Failed to delete item.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
