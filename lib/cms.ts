import { put, head } from "@vercel/blob";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CmsItemType = "image" | "video";

export type CmsWorkflow =
  | "face-swap"
  | "image-edition"
  | "person-swap"
  | "motion-control";

export interface CmsItem {
  id: string;
  title: string;
  type: CmsItemType;
  /** HTTPS URL of the primary media asset (image or video). */
  url: string;
  /** For videos: the source model photo; for images: same as url. */
  thumbnail: string;
  workflow: CmsWorkflow;
  createdAt: string; // ISO 8601
}

export interface CmsManifest {
  items: CmsItem[];
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const MANIFEST_KEY = "cms-manifest.json";

/**
 * Read the manifest from Vercel Blob.
 * Returns { items: [] } on first run (blob does not exist yet).
 */
export async function readManifest(): Promise<CmsManifest> {
  try {
    const existing = await head(MANIFEST_KEY);
    const res = await fetch(existing.url, { cache: "no-store" });
    return (await res.json()) as CmsManifest;
  } catch {
    return { items: [] };
  }
}

/**
 * Write (overwrite) the manifest in Vercel Blob.
 * addRandomSuffix: false ensures the same key is reused every time.
 */
export async function writeManifest(manifest: CmsManifest): Promise<void> {
  await put(MANIFEST_KEY, JSON.stringify(manifest), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}
