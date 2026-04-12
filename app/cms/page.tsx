import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowLeft, ImageOff, Trash2, Image as ImageIcon, Film } from "lucide-react";
import { readManifest, type CmsItem } from "@/lib/cms";
import DeleteButton from "./DeleteButton";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const WORKFLOW_LABELS: Record<CmsItem["workflow"], string> = {
  "face-swap": "Face Swap",
  "image-edition": "Image Edit",
  "person-swap": "Person Swap",
  "motion-control": "Motion Control",
};

export default async function CmsDashboard() {
  const { items } = await readManifest();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">AI Models Factory</h1>
              <p className="text-xs text-white/40">Published Content</p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Studio
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Title row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Gallery</h2>
            <p className="text-white/40 text-sm mt-1">
              {items.length === 0
                ? "No published items yet"
                : `${items.length} published item${items.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <ImageOff className="w-9 h-9 text-white/20" />
            </div>
            <p className="text-white/30 text-sm">
              Publish your first image or video from the Studio
            </p>
            <Link
              href="/"
              className="mt-2 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
            >
              Open Studio →
            </Link>
          </div>
        )}

        {/* Grid */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((item) => (
              <div
                key={item.id}
                className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/8 hover:border-white/20 transition-all duration-200"
              >
                {/* Thumbnail */}
                <div className="relative aspect-[3/4] bg-white/5">
                  {item.thumbnail ? (
                    <Image
                      src={item.thumbnail}
                      alt={item.title}
                      fill
                      className="object-cover"
                      unoptimized={item.thumbnail.startsWith("data:")}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-8 h-8 text-white/20" />
                    </div>
                  )}

                  {/* Type badge */}
                  <div className="absolute top-2.5 left-2.5">
                    <span
                      className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        item.type === "video"
                          ? "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30"
                          : "bg-violet-500/20 text-violet-300 border-violet-500/30"
                      }`}
                    >
                      {item.type === "video" ? (
                        <Film className="w-3 h-3" />
                      ) : (
                        <ImageIcon className="w-3 h-3" />
                      )}
                      {item.type === "video" ? "Video" : "Image"}
                    </span>
                  </div>

                  {/* Delete button — visible on hover */}
                  <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DeleteButton id={item.id} />
                  </div>

                  {/* Video play overlay */}
                  {item.type === "video" && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-sm"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                        <Film className="w-5 h-5 text-white" />
                      </div>
                    </a>
                  )}
                </div>

                {/* Meta */}
                <div className="p-3">
                  <p className="font-semibold text-sm text-white truncate">{item.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-white/40">
                      {WORKFLOW_LABELS[item.workflow]}
                    </span>
                    <span className="text-xs text-white/30">{formatDate(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
