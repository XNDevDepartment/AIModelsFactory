import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { readManifest, writeManifest, type CmsItem, type CmsWorkflow } from "@/lib/cms";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      title: string;
      type: "image" | "video";
      url: string;
      thumbnail: string;
      workflow: CmsWorkflow;
    };

    const { title, type, workflow } = body;
    let { url, thumbnail } = body;

    if (!title || !type || !url || !workflow) {
      return NextResponse.json(
        { error: "title, type, url, and workflow are required." },
        { status: 400 }
      );
    }

    // If the URL is a base64 data URI (e.g. from image-edition workflow),
    // upload it as a real blob so the manifest stays lightweight.
    if (url.startsWith("data:")) {
      const mimeMatch = url.match(/^data:([\w/]+);base64,/);
      const mimeType = mimeMatch?.[1] ?? "image/jpeg";
      const base64 = url.replace(/^data:[\w/]+;base64,/, "");
      const buffer = Buffer.from(base64, "base64");
      const ext = mimeType.split("/")[1] ?? "jpg";
      const blob = await put(`cms-media-${crypto.randomUUID()}.${ext}`, buffer, {
        access: "public",
        contentType: mimeType,
      });
      url = blob.url;
      thumbnail = blob.url;
    }

    if (thumbnail.startsWith("data:")) {
      const mimeMatch = thumbnail.match(/^data:([\w/]+);base64,/);
      const mimeType = mimeMatch?.[1] ?? "image/jpeg";
      const base64 = thumbnail.replace(/^data:[\w/]+;base64,/, "");
      const buffer = Buffer.from(base64, "base64");
      const blob = await put(`cms-thumb-${crypto.randomUUID()}.jpg`, buffer, {
        access: "public",
        contentType: mimeType,
      });
      thumbnail = blob.url;
    }

    const item: CmsItem = {
      id: crypto.randomUUID(),
      title,
      type,
      url,
      thumbnail,
      workflow,
      createdAt: new Date().toISOString(),
    };

    const manifest = await readManifest();
    manifest.items.unshift(item); // newest first
    await writeManifest(manifest);

    return NextResponse.json(item, { status: 201 });
  } catch (err: unknown) {
    console.error("CMS publish error:", err);
    const message = err instanceof Error ? err.message : "Failed to publish.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
