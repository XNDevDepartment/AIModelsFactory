"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Film, ChevronDown, ChevronUp, Download, Loader2, X } from "lucide-react";

type Status = "idle" | "generating" | "done" | "error";

export default function MotionControlPage() {
  // ── inputs ────────────────────────────────────────────────────────────────
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile]     = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [prompt, setPrompt]           = useState("");

  // advanced
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [cfgScale, setCfgScale]   = useState(0.5);
  const [duration, setDuration]   = useState<number | "">("");

  // ── output ────────────────────────────────────────────────────────────────
  const [status, setStatus]       = useState<Status>("idle");
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  // ── drag state ────────────────────────────────────────────────────────────
  const [imageDragging, setImageDragging] = useState(false);
  const [videoDragging, setVideoDragging] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // ── file handlers ─────────────────────────────────────────────────────────
  function loadImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }

  function loadVideo(file: File) {
    if (!file.type.startsWith("video/")) return;
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  }

  function clearVideo() {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
  }

  // drag-drop
  const onImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setImageDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadImage(file);
  }, []);

  const onVideoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setVideoDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadVideo(file);
  }, []);

  // ── submit ────────────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!imageFile || !videoFile) return;
    setStatus("generating");
    setError(null);
    setResultVideoUrl(null);

    const fd = new FormData();
    fd.append("image", imageFile);
    fd.append("video", videoFile);
    if (prompt.trim())        fd.append("prompt", prompt.trim());
    if (negativePrompt.trim()) fd.append("negative_prompt", negativePrompt.trim());
    if (cfgScale !== 0.5)     fd.append("cfg_scale", String(cfgScale));
    if (duration !== "")      fd.append("duration", String(duration));

    try {
      const res = await fetch("/api/motion-control", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Motion control failed.");
      setResultVideoUrl(data.videoUrl);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  const canGenerate = !!imageFile && !!videoFile && status !== "generating";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Motion Control</h1>
            <p className="text-xs text-white/40">Kling v2.6 Pro · Transfer motion from video to image</p>
          </div>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 p-6 lg:p-8 max-w-7xl mx-auto">

        {/* ── Left panel: inputs ──────────────────────────────────────── */}
        <div className="flex-1 space-y-5">

          {/* Image upload */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
              Reference Image <span className="text-fuchsia-400">*</span>
            </label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-video bg-black flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Reference" className="max-h-64 max-w-full object-contain" />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-black flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setImageDragging(true); }}
                onDragLeave={() => setImageDragging(false)}
                onDrop={onImageDrop}
                onClick={() => imageInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
                  imageDragging ? "border-fuchsia-400 bg-fuchsia-400/5" : "border-white/15 hover:border-white/30 hover:bg-white/3"
                }`}
              >
                <Upload className="w-6 h-6 text-white/30" />
                <div className="text-center">
                  <p className="text-sm font-medium text-white/60">Drop image here or click to browse</p>
                  <p className="text-xs text-white/30 mt-1">JPG, PNG, WEBP</p>
                </div>
              </div>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadImage(f); e.target.value = ""; }}
            />
          </div>

          {/* Video upload */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
              Reference Video <span className="text-fuchsia-400">*</span>
            </label>
            {videoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black">
                <video
                  src={videoPreview}
                  controls
                  muted
                  className="w-full max-h-64 object-contain"
                />
                <button
                  onClick={clearVideo}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-black flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setVideoDragging(true); }}
                onDragLeave={() => setVideoDragging(false)}
                onDrop={onVideoDrop}
                onClick={() => videoInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
                  videoDragging ? "border-fuchsia-400 bg-fuchsia-400/5" : "border-white/15 hover:border-white/30 hover:bg-white/3"
                }`}
              >
                <Film className="w-6 h-6 text-white/30" />
                <div className="text-center">
                  <p className="text-sm font-medium text-white/60">Drop video here or click to browse</p>
                  <p className="text-xs text-white/30 mt-1">MP4, MOV, WEBM · up to 30 s</p>
                </div>
              </div>
            )}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadVideo(f); e.target.value = ""; }}
            />
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
              Prompt <span className="text-white/25">(optional)</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Environmental framing, lighting conditions, stylistic direction…"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-fuchsia-400/50 resize-none"
            />
          </div>

          {/* Advanced options */}
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
            >
              <span className="font-medium">Advanced options</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAdvanced && (
              <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1.5">Negative prompt</label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    rows={2}
                    placeholder="blurry, distorted, watermark, low quality…"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-fuchsia-400/50 resize-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-white/40">CFG scale</label>
                    <span className="text-xs text-white/60 tabular-nums">{cfgScale.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0} max={1} step={0.01}
                    value={cfgScale}
                    onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                    className="w-full accent-fuchsia-400"
                  />
                  <div className="flex justify-between text-[10px] text-white/25 mt-0.5">
                    <span>Creative</span><span>Strict</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1.5">Duration (seconds)</label>
                  <input
                    type="number"
                    min={1} max={30} step={1}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                    placeholder="auto"
                    className="w-32 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-fuchsia-400/50"
                  />
                  <p className="text-[10px] text-white/25 mt-1">1–30 seconds. Leave blank for auto.</p>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {status === "error" && error && (
            <div className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 py-3.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {status === "generating" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Film className="w-4 h-4" />
                Generate Video
              </>
            )}
          </button>
          {!imageFile || !videoFile ? (
            <p className="text-center text-xs text-white/30">
              Upload both an image and a video to generate.
            </p>
          ) : null}
        </div>

        {/* ── Right panel: output ─────────────────────────────────────── */}
        <div className="lg:w-[480px] xl:w-[560px] shrink-0">
          <label className="block text-xs font-semibold uppercase tracking-widest text-white/40 mb-2">
            Output
          </label>
          <div className="rounded-xl border border-white/10 overflow-hidden bg-slate-900 aspect-video flex items-center justify-center">
            {status === "idle" && (
              <div className="flex flex-col items-center gap-3 text-white/25 p-8">
                <Film className="w-10 h-10" />
                <p className="text-sm text-center">Your generated video will appear here</p>
              </div>
            )}
            {status === "generating" && (
              <div className="flex flex-col items-center gap-4 p-8">
                <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
                <div className="text-center">
                  <p className="text-sm font-medium text-white/80">Kling v2.6 Pro is generating your video…</p>
                  <p className="text-xs text-white/35 mt-1">This usually takes 30–120 seconds.</p>
                </div>
              </div>
            )}
            {status === "error" && (
              <div className="flex flex-col items-center gap-3 text-red-400/60 p-8">
                <X className="w-8 h-8" />
                <p className="text-sm text-center">Generation failed. Check the error above and try again.</p>
              </div>
            )}
            {status === "done" && resultVideoUrl && (
              <video
                src={resultVideoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {status === "done" && resultVideoUrl && (
            <div className="mt-3 flex gap-2">
              <a
                href={resultVideoUrl}
                download="motion-control-output.mp4"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/15 py-2.5 text-sm hover:bg-white/5 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            </div>
          )}

          {/* Info card */}
          <div className="mt-4 rounded-xl border border-white/8 bg-white/3 p-4 space-y-2 text-xs text-white/40">
            <p className="font-semibold text-white/60 text-[11px] uppercase tracking-widest">How it works</p>
            <p>The <span className="text-white/70">reference image</span> defines the character's appearance — clothing, face, background.</p>
            <p>The <span className="text-white/70">reference video</span> defines the motion pattern. The model transfers those movements onto the character.</p>
            <p>Use the <span className="text-white/70">prompt</span> to guide lighting, environment, and overall style.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
