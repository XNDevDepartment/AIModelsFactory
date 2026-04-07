"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload, Sparkles, ArrowRight, RotateCcw, Download,
  Zap, Camera, User, Film, Play, Wand2, Users,
} from "lucide-react";
import Image from "next/image";

// ── Types ────────────────────────────────────────────────────
type Workflow = "face-swap" | "image-edition" | "person-swap";

type Step =
  | "workflow-select"
  | "upload"
  | "select-model"
  | "edit-prompt"
  | "processing"
  | "result"
  | "motion-control"
  | "motion-processing"
  | "video-result";

interface GeminiAnalysis {
  description: string;
  modelStyle: string;
  suggestions: string[];
}

// ── Constants ────────────────────────────────────────────────
const MODEL_PRESETS = [
  {
    id: "fashion-editorial",
    label: "Fashion Editorial",
    description: "High-end magazine style",
    emoji: "👗",
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=600&fit=crop",
  },
  {
    id: "streetwear",
    label: "Streetwear",
    description: "Urban street style",
    emoji: "🧢",
    image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400&h=600&fit=crop",
  },
  {
    id: "business",
    label: "Business Pro",
    description: "Corporate professional look",
    emoji: "💼",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop",
  },
  {
    id: "casual",
    label: "Casual Cool",
    description: "Relaxed everyday wear",
    emoji: "😎",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop",
  },
];

const WORKFLOW_STEPS: Record<Workflow, Array<{ key: string; label: string; icon: React.ComponentType<{ className?: string }> }>> = {
  "face-swap": [
    { key: "upload",           label: "Upload",     icon: Camera   },
    { key: "select-model",     label: "Style",      icon: User     },
    { key: "processing",       label: "Processing", icon: Zap      },
    { key: "result",           label: "Photo",      icon: Sparkles },
    { key: "motion-control",   label: "Motion",     icon: Film     },
    { key: "motion-processing",label: "Rendering",  icon: Zap      },
    { key: "video-result",     label: "Video",      icon: Play     },
  ],
  "image-edition": [
    { key: "upload",     label: "Upload",     icon: Camera   },
    { key: "edit-prompt",label: "Edit",       icon: Wand2    },
    { key: "processing", label: "Processing", icon: Zap      },
    { key: "result",     label: "Result",     icon: Sparkles },
  ],
  "person-swap": [
    { key: "upload",      label: "Upload",     icon: Camera   },
    { key: "select-model",label: "Reference",  icon: Users    },
    { key: "processing",  label: "Processing", icon: Zap      },
    { key: "result",      label: "Result",     icon: Sparkles },
  ],
};

const WORKFLOWS: Array<{
  id: Workflow;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  badge: string;
}> = [
  {
    id: "face-swap",
    title: "Face Swap",
    subtitle: "Fal.ai + Gemini",
    description: "Place your face onto professional model shots, get an AI style analysis, and optionally animate the result with motion control.",
    icon: User,
    gradient: "from-violet-600 to-fuchsia-600",
    badge: "Original",
  },
  {
    id: "image-edition",
    title: "Image Edition",
    subtitle: "Gemini 2.0 Flash",
    description: "Upload your photo and describe how you want it edited — change outfits, backgrounds, lighting, style, and more with a simple text prompt.",
    icon: Wand2,
    gradient: "from-cyan-600 to-blue-600",
    badge: "New",
  },
  {
    id: "person-swap",
    title: "Person Swap",
    subtitle: "GPT Image 2",
    description: "Replace your entire appearance — clothing, hair, style — to match a reference model or preset style, while keeping your face.",
    icon: Users,
    gradient: "from-emerald-600 to-teal-600",
    badge: "New",
  },
];

// ── Component ─────────────────────────────────────────────────
export default function AIModelsFactory() {
  const [step, setStep] = useState<Step>("workflow-select");
  const [workflow, setWorkflow] = useState<Workflow | null>(null);

  // Shared
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<(typeof MODEL_PRESETS)[0] | null>(null);
  const [customModelImage, setCustomModelImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Face-swap specific
  const [geminiAnalysis, setGeminiAnalysis] = useState<GeminiAnalysis | null>(null);
  const [motionVideoFile, setMotionVideoFile] = useState<File | null>(null);
  const [motionVideoPreview, setMotionVideoPreview] = useState<string | null>(null);
  const [motionPrompt, setMotionPrompt] = useState("");
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [isVideoDragging, setIsVideoDragging] = useState(false);
  const [motionProgress, setMotionProgress] = useState(0);

  // Image-edition specific
  const [editPrompt, setEditPrompt] = useState("");

  const userPhotoInputRef = useRef<HTMLInputElement>(null);
  const customModelInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // ── Derived ──────────────────────────────────────────────────
  const steps = workflow ? WORKFLOW_STEPS[workflow] : [];
  const currentStepIdx = steps.findIndex((s) => s.key === step);

  // ── Handlers ─────────────────────────────────────────────────
  const selectWorkflow = (w: Workflow) => {
    setWorkflow(w);
    setStep("upload");
    setError(null);
  };

  const handleUserPhotoUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUserPhoto(e.target?.result as string);
        setError(null);
        if (workflow === "image-edition") {
          setStep("edit-prompt");
        } else {
          setStep("select-model");
        }
      };
      reader.readAsDataURL(file);
    },
    [workflow]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUserPhotoUpload(file);
    },
    [handleUserPhotoUpload]
  );

  const handleCustomModelUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setCustomModelImage(e.target?.result as string);
      setSelectedModel(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // ── Face Swap ─────────────────────────────────────────────────
  const runFaceSwap = async () => {
    if (!userPhoto) return;
    const targetImage = customModelImage || selectedModel?.image;
    if (!targetImage) {
      setError("Please select a model style or upload a custom model image.");
      return;
    }

    setStep("processing");
    setProgress(0);
    setError(null);

    const interval = setInterval(() => setProgress((p) => Math.min(p + Math.random() * 12, 88)), 800);

    try {
      const [geminiRes, falRes] = await Promise.all([
        fetch("/api/gemini-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: userPhoto }),
        }),
        fetch("/api/face-swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceImage: userPhoto, targetImage }),
        }),
      ]);

      clearInterval(interval);
      setProgress(95);

      if (!falRes.ok) {
        const err = await falRes.json();
        throw new Error(err.error || "Face swap failed.");
      }

      const falData = await falRes.json();
      setResultImage(falData.imageUrl);

      if (geminiRes.ok) {
        const gData = await geminiRes.json();
        setGeminiAnalysis(gData);
      }

      setProgress(100);
      setStep("result");
    } catch (err: unknown) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep("select-model");
    }
  };

  // ── Gemini Image Edition ──────────────────────────────────────
  const runGeminiEdit = async () => {
    if (!userPhoto || !editPrompt.trim()) return;

    setStep("processing");
    setProgress(0);
    setError(null);

    const interval = setInterval(() => setProgress((p) => Math.min(p + Math.random() * 10, 88)), 900);

    try {
      const res = await fetch("/api/gemini-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: userPhoto, prompt: editPrompt.trim() }),
      });

      clearInterval(interval);
      setProgress(95);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gemini image edit failed.");
      }

      const data = await res.json();
      setResultImage(data.imageUrl);
      setProgress(100);
      setStep("result");
    } catch (err: unknown) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : "Image edit failed. Please try again.");
      setStep("edit-prompt");
    }
  };

  // ── Person Swap ───────────────────────────────────────────────
  const runPersonSwap = async () => {
    if (!userPhoto) return;
    const targetImage = customModelImage || null;
    const targetLabel = selectedModel?.label ?? null;

    if (!targetImage && !selectedModel) {
      setError("Please select a style or upload a custom reference image.");
      return;
    }

    setStep("processing");
    setProgress(0);
    setError(null);

    const interval = setInterval(() => setProgress((p) => Math.min(p + Math.random() * 8, 88)), 1000);

    try {
      const res = await fetch("/api/person-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceImage: userPhoto, targetImage, targetLabel }),
      });

      clearInterval(interval);
      setProgress(95);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Person swap failed.");
      }

      const data = await res.json();
      setResultImage(data.imageUrl);
      setProgress(100);
      setStep("result");
    } catch (err: unknown) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : "Person swap failed. Please try again.");
      setStep("select-model");
    }
  };

  const handleSelectModelNext = () => {
    if (workflow === "person-swap") runPersonSwap();
    else runFaceSwap();
  };

  // ── Motion Control ────────────────────────────────────────────
  const handleVideoUpload = useCallback((file: File) => {
    setMotionVideoFile(file);
    setMotionVideoPreview(URL.createObjectURL(file));
    setError(null);
  }, []);

  const handleVideoDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsVideoDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleVideoUpload(file);
    },
    [handleVideoUpload]
  );

  const runMotionControl = async () => {
    if (!resultImage || !motionVideoFile) return;

    setStep("motion-processing");
    setMotionProgress(0);
    setError(null);

    const interval = setInterval(() => setMotionProgress((p) => Math.min(p + Math.random() * 6, 88)), 1200);

    try {
      const formData = new FormData();
      formData.append("video", motionVideoFile);
      formData.append("imageUrl", resultImage);
      if (motionPrompt.trim()) formData.append("prompt", motionPrompt.trim());

      const res = await fetch("/api/motion-control", { method: "POST", body: formData });

      clearInterval(interval);
      setMotionProgress(95);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Motion control failed.");
      }

      const data = await res.json();
      setResultVideoUrl(data.videoUrl);
      setMotionProgress(100);
      setStep("video-result");
    } catch (err: unknown) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : "Video generation failed. Please try again.");
      setStep("motion-control");
    }
  };

  // ── Reset ─────────────────────────────────────────────────────
  const reset = () => {
    setStep("workflow-select");
    setWorkflow(null);
    setUserPhoto(null);
    setSelectedModel(null);
    setCustomModelImage(null);
    setResultImage(null);
    setGeminiAnalysis(null);
    setProgress(0);
    setError(null);
    setEditPrompt("");
    setMotionVideoFile(null);
    setMotionVideoPreview(null);
    setMotionPrompt("");
    setResultVideoUrl(null);
    setMotionProgress(0);
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = "ai-model-photo.png";
    a.click();
  };

  const downloadVideo = () => {
    if (!resultVideoUrl) return;
    const a = document.createElement("a");
    a.href = resultVideoUrl;
    a.download = "ai-model-video.mp4";
    a.click();
  };

  // ── Processing labels per workflow ────────────────────────────
  const processingLabels =
    workflow === "image-edition"
      ? [
          { label: "Analyzing image", done: progress > 20 },
          { label: "Generating edit", done: progress > 45 },
          { label: "Applying changes", done: progress > 65 },
          { label: "Finalizing", done: progress > 85 },
        ]
      : workflow === "person-swap"
      ? [
          { label: "Analyzing person", done: progress > 20 },
          { label: "Generating transformation", done: progress > 45 },
          { label: "Applying style", done: progress > 65 },
          { label: "Finalizing", done: progress > 85 },
        ]
      : [
          { label: "Detecting face", done: progress > 20 },
          { label: "Analyzing lighting", done: progress > 40 },
          { label: "Swapping face (Fal.ai)", done: progress > 65 },
          { label: "Gemini analysis", done: progress > 85 },
        ];

  const processingTitle =
    workflow === "image-edition"
      ? "Editing Your Photo"
      : workflow === "person-swap"
      ? "Swapping Your Look"
      : "Creating Your Model Photo";

  const processingSubtitle =
    workflow === "image-edition"
      ? "Gemini 2.0 Flash is applying your edits"
      : workflow === "person-swap"
      ? "GPT Image 2 is transforming your appearance"
      : "Fal.ai is swapping faces · Gemini is analyzing your shot";

  // ── Select-model labels per workflow ──────────────────────────
  const selectModelTitle = workflow === "person-swap" ? "Choose Reference Style" : "Choose a Style";
  const selectModelButton = workflow === "person-swap" ? "Swap My Look" : "Generate My Model Photo";

  // ── Render ────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={reset}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h1 className="font-bold text-lg leading-tight">AI Models Factory</h1>
              <p className="text-xs text-white/40">
                {workflow === "face-swap"
                  ? "Fal.ai + Gemini"
                  : workflow === "image-edition"
                  ? "Gemini 2.0 Flash"
                  : workflow === "person-swap"
                  ? "GPT Image 2"
                  : "3 AI Workflows"}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2 text-xs text-white/50">
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span>Gemini</span>
            <span className="text-white/20">·</span>
            <span>Fal.ai</span>
            <span className="text-white/20">·</span>
            <span>GPT Image 2</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* Step Indicator (only shown after workflow selected) */}
        {workflow && step !== "workflow-select" && (
          <div className="flex items-center justify-center gap-2 mb-12 flex-wrap">
            {steps.map((s, i) => {
              const isActive = s.key === step;
              const isDone = currentStepIdx > i;
              const Icon = s.icon;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isDone
                          ? "bg-violet-500 text-white"
                          : isActive
                          ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/40 scale-110"
                          : "bg-white/10 text-white/20"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span
                      className={`text-xs font-medium hidden sm:block transition-colors ${
                        isActive ? "text-white" : isDone ? "text-violet-400" : "text-white/25"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-white/15 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-8 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-5 py-4 text-sm">
            {error}
          </div>
        )}

        {/* ── WORKFLOW SELECT ── */}
        {step === "workflow-select" && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                AI Models Factory
              </h2>
              <p className="text-white/50 text-base max-w-lg mx-auto">
                Choose your workflow — each uses a different AI to transform your photo into a professional model shot.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {WORKFLOWS.map((w) => {
                const Icon = w.icon;
                return (
                  <button
                    key={w.id}
                    onClick={() => selectWorkflow(w.id)}
                    className="relative group text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 p-6 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20"
                  >
                    {/* Badge */}
                    <span
                      className={`absolute top-4 right-4 text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${w.gradient} text-white`}
                    >
                      {w.badge}
                    </span>

                    {/* Icon */}
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${w.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    {/* Text */}
                    <h3 className="font-bold text-lg mb-1 text-white">{w.title}</h3>
                    <p className="text-xs text-white/40 mb-3 font-medium">{w.subtitle}</p>
                    <p className="text-sm text-white/55 leading-relaxed">{w.description}</p>

                    {/* Arrow */}
                    <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-white/40 group-hover:text-white/70 transition-colors">
                      Start <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP: Upload ── */}
        {step === "upload" && (
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                {workflow === "image-edition"
                  ? "Upload Your Photo"
                  : workflow === "person-swap"
                  ? "Upload Your Photo"
                  : "Become an AI Model"}
              </h2>
              <p className="text-white/50 text-sm">
                {workflow === "image-edition"
                  ? "Upload your photo and describe how you want it edited with Gemini."
                  : workflow === "person-swap"
                  ? "Upload your photo and we'll replace your entire look using GPT Image 2."
                  : "Upload your photo and we'll place your face into professional model shots."}
              </p>
            </div>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => userPhotoInputRef.current?.click()}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-5 py-20 px-8 group ${
                isDragging
                  ? "border-violet-400 bg-violet-500/10 scale-[1.01]"
                  : "border-white/20 hover:border-violet-400/60 hover:bg-white/5"
              }`}
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Upload className="w-9 h-9 text-violet-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-white mb-1">Drop your photo here</p>
                <p className="text-white/40 text-sm">or click to browse · JPG, PNG, WEBP</p>
              </div>
              <input
                ref={userPhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUserPhotoUpload(e.target.files[0])}
              />
            </div>
            <button
              onClick={() => { setStep("workflow-select"); setError(null); }}
              className="mt-5 w-full py-2.5 rounded-xl text-sm text-white/40 hover:text-white/60 transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Back to workflow selection
            </button>
          </div>
        )}

        {/* ── STEP: Edit Prompt (image-edition) ── */}
        {step === "edit-prompt" && workflow === "image-edition" && userPhoto && (
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">Your Photo</h3>
              <div className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 aspect-[3/4]">
                <Image src={userPhoto} alt="Your photo" fill className="object-cover" />
                <button
                  onClick={() => { setStep("upload"); setUserPhoto(null); }}
                  className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white/70 hover:text-white rounded-lg p-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-1">Edit Prompt</h3>
                <p className="text-white/35 text-xs mb-4">Describe what you want Gemini to change in your photo.</p>

                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="e.g. Make me look like a high-fashion model in Paris wearing a elegant black dress, professional studio lighting"
                  rows={5}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-cyan-400/60 resize-none transition-colors"
                />

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    "Change outfit to business suit",
                    "Add studio lighting",
                    "Make it look editorial fashion",
                    "Change background to beach",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setEditPrompt(suggestion)}
                      className="text-xs text-left px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/40 hover:bg-cyan-500/5 text-white/50 hover:text-white/70 transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={runGeminiEdit}
                disabled={!editPrompt.trim()}
                className="mt-auto w-full py-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                Edit with Gemini
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: Select Model (face-swap & person-swap) ── */}
        {step === "select-model" && (
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">Your Photo</h3>
              <div className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 aspect-[3/4]">
                {userPhoto && <Image src={userPhoto} alt="Your photo" fill className="object-cover" />}
                <button
                  onClick={() => { setStep("upload"); setUserPhoto(null); }}
                  className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white/70 hover:text-white rounded-lg p-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">{selectModelTitle}</h3>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {MODEL_PRESETS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => { setSelectedModel(model); setCustomModelImage(null); }}
                    className={`relative rounded-xl overflow-hidden aspect-[3/4] border-2 transition-all duration-200 ${
                      selectedModel?.id === model.id
                        ? "border-violet-400 shadow-lg shadow-violet-500/30 scale-[1.02]"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <Image src={model.image} alt={model.label} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                      <p className="text-xs font-bold">{model.emoji} {model.label}</p>
                      <p className="text-xs text-white/50">{model.description}</p>
                    </div>
                    {selectedModel?.id === model.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
                        <span className="text-xs">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div
                onClick={() => customModelInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-4 flex items-center gap-3 transition-all ${
                  customModelImage
                    ? "border-violet-400 bg-violet-500/10"
                    : "border-white/15 hover:border-violet-400/50 hover:bg-white/5"
                }`}
              >
                {customModelImage ? (
                  <>
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <Image src={customModelImage} alt="Custom model" fill className="object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-violet-300">Custom image selected</p>
                      <p className="text-xs text-white/40">Click to change</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Upload className="w-5 h-5 text-white/40" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/70">
                        {workflow === "person-swap" ? "Upload custom reference" : "Upload custom model image"}
                      </p>
                      <p className="text-xs text-white/30">Use your own reference photo</p>
                    </div>
                  </>
                )}
                <input
                  ref={customModelInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleCustomModelUpload(e.target.files[0])}
                />
              </div>

              <button
                onClick={handleSelectModelNext}
                disabled={!selectedModel && !customModelImage}
                className="mt-5 w-full py-4 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {selectModelButton}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: Processing ── */}
        {step === "processing" && (
          <div className="max-w-md mx-auto text-center">
            <div className="mb-10">
              <div className="relative w-28 h-28 mx-auto mb-8">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 animate-pulse opacity-30" />
                <div
                  className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 opacity-60 animate-spin"
                  style={{ animationDuration: "3s" }}
                />
                <div className="absolute inset-4 rounded-full bg-slate-950 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-violet-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">{processingTitle}</h2>
              <p className="text-white/40 text-sm">{processingSubtitle}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="flex justify-between text-xs text-white/50 mb-2">
                <span>Processing…</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                {processingLabels.map((item) => (
                  <div key={item.label} className={`flex items-center gap-2 transition-colors ${item.done ? "text-violet-300" : "text-white/30"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.done ? "bg-violet-400" : "bg-white/20"}`} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: Result ── */}
        {step === "result" && resultImage && (
          <div className="grid lg:grid-cols-5 gap-10">
            <div className="lg:col-span-3">
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">
                {workflow === "image-edition" ? "Edited Photo" : workflow === "person-swap" ? "Transformed Photo" : "Your Model Photo"}
              </h3>
              <div className="relative rounded-2xl overflow-hidden border border-violet-500/30 shadow-2xl shadow-violet-500/10 aspect-[3/4]">
                <Image src={resultImage} alt="Result" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 flex gap-3">
                  <button
                    onClick={downloadResult}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={reset}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Start Over
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-5">
              {/* Gemini analysis — only for face-swap */}
              {workflow === "face-swap" && (
                <>
                  <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Gemini Analysis</h3>
                  {geminiAnalysis ? (
                    <>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="w-4 h-4 text-violet-400" />
                          <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">Style Read</span>
                        </div>
                        <p className="text-sm text-white/70 leading-relaxed">{geminiAnalysis.description}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="w-4 h-4 text-fuchsia-400" />
                          <span className="text-xs font-semibold text-fuchsia-300 uppercase tracking-wider">Model Style</span>
                        </div>
                        <p className="text-sm text-white/70 leading-relaxed">{geminiAnalysis.modelStyle}</p>
                      </div>
                      {geminiAnalysis.suggestions.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <Camera className="w-4 h-4 text-cyan-400" />
                            <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Pro Tips</span>
                          </div>
                          <ul className="space-y-2">
                            {geminiAnalysis.suggestions.map((s, i) => (
                              <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                                <span className="text-violet-400 mt-0.5">·</span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-3">
                      <Zap className="w-4 h-4 text-violet-400 flex-shrink-0" />
                      <p className="text-sm text-white/40">Gemini analysis unavailable.</p>
                    </div>
                  )}
                </>
              )}

              {/* Info card for image-edition / person-swap */}
              {workflow !== "face-swap" && (
                <>
                  <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Details</h3>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-violet-400" />
                      <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">Generation Info</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-white/50">
                      <li className="flex justify-between">
                        <span>Workflow</span>
                        <span className="text-white/70">
                          {workflow === "image-edition" ? "Image Edition" : "Person Swap"}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>Model</span>
                        <span className="text-white/70">
                          {workflow === "image-edition" ? "Gemini 2.0 Flash" : "GPT Image 2"}
                        </span>
                      </li>
                      {workflow === "image-edition" && editPrompt && (
                        <li className="pt-2 border-t border-white/10">
                          <span className="block text-white/30 mb-1">Prompt</span>
                          <span className="text-white/60 italic">{editPrompt}</span>
                        </li>
                      )}
                      {workflow === "person-swap" && (selectedModel || customModelImage) && (
                        <li className="flex justify-between">
                          <span>Reference style</span>
                          <span className="text-white/70">{selectedModel?.label ?? "Custom"}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </>
              )}

              {/* Before / After */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-white/30 mb-2 text-center">Before</p>
                  <div className="relative rounded-xl overflow-hidden aspect-square border border-white/10">
                    {userPhoto && <Image src={userPhoto} alt="Before" fill className="object-cover" />}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/30 mb-2 text-center">After</p>
                  <div className="relative rounded-xl overflow-hidden aspect-square border border-violet-500/30">
                    <Image src={resultImage} alt="After" fill className="object-cover" />
                  </div>
                </div>
              </div>

              {/* Motion Control CTA — only for face-swap */}
              {workflow === "face-swap" && (
                <button
                  onClick={() => setStep("motion-control")}
                  className="w-full py-4 rounded-xl font-bold text-sm bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 transition-all duration-200 shadow-lg shadow-fuchsia-500/30 flex items-center justify-center gap-2"
                >
                  <Film className="w-4 h-4" />
                  Animate with Motion Control
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── STEP: Motion Control ── */}
        {step === "motion-control" && resultImage && (
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">Your Model Photo</h3>
              <div className="relative rounded-2xl overflow-hidden border border-violet-500/30 aspect-[3/4]">
                <Image src={resultImage} alt="Model" fill className="object-cover" />
                <button
                  onClick={() => setStep("result")}
                  className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white/70 hover:text-white rounded-lg p-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">Motion Control</h3>
                <p className="text-white/40 text-xs mb-5">
                  Upload a reference video — Kling v2.6 Pro will animate your model photo following the motion in the video.
                </p>

                <div
                  onDrop={handleVideoDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsVideoDragging(true); }}
                  onDragLeave={() => setIsVideoDragging(false)}
                  onClick={() => !motionVideoFile && videoInputRef.current?.click()}
                  className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden ${
                    motionVideoFile
                      ? "border-fuchsia-400 bg-fuchsia-500/5"
                      : isVideoDragging
                      ? "border-fuchsia-400 bg-fuchsia-500/10 scale-[1.01]"
                      : "border-white/20 hover:border-fuchsia-400/60 hover:bg-white/5 cursor-pointer"
                  }`}
                  style={{ minHeight: "200px" }}
                >
                  {motionVideoPreview ? (
                    <div className="relative">
                      <video src={motionVideoPreview} className="w-full rounded-xl" controls muted />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMotionVideoFile(null);
                          setMotionVideoPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white/70 hover:text-white rounded-lg p-1.5 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center">
                        <Film className="w-7 h-7 text-fuchsia-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-1">Drop your reference video</p>
                        <p className="text-white/40 text-xs">or click to browse · MP4, MOV, WEBM</p>
                      </div>
                    </div>
                  )}
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-2">
                  Prompt <span className="text-white/20 normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  value={motionPrompt}
                  onChange={(e) => setMotionPrompt(e.target.value)}
                  placeholder="e.g. walking confidently on a runway, hair flowing in the wind…"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-fuchsia-400/60 resize-none transition-colors"
                />
              </div>

              <button
                onClick={runMotionControl}
                disabled={!motionVideoFile}
                className="w-full py-4 rounded-xl font-bold text-sm bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-fuchsia-500/30 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Generate Video
              </button>

              <p className="text-xs text-white/25 text-center">
                Uses Kling v2.6 Pro · character_orientation: video
              </p>
            </div>
          </div>
        )}

        {/* ── STEP: Motion Processing ── */}
        {step === "motion-processing" && (
          <div className="max-w-md mx-auto text-center">
            <div className="mb-10">
              <div className="relative w-28 h-28 mx-auto mb-8">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 animate-pulse opacity-30" />
                <div
                  className="absolute inset-2 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 opacity-60 animate-spin"
                  style={{ animationDuration: "4s" }}
                />
                <div className="absolute inset-4 rounded-full bg-slate-950 flex items-center justify-center">
                  <Film className="w-8 h-8 text-fuchsia-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Generating Your Video</h2>
              <p className="text-white/40 text-sm">Kling v2.6 Pro is animating your model · this may take a minute</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="flex justify-between text-xs text-white/50 mb-2">
                <span>Rendering…</span>
                <span>{Math.round(motionProgress)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-full transition-all duration-700"
                  style={{ width: `${motionProgress}%` }}
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: "Uploading video",   done: motionProgress > 15 },
                  { label: "Analyzing motion",  done: motionProgress > 35 },
                  { label: "Applying to model", done: motionProgress > 60 },
                  { label: "Rendering frames",  done: motionProgress > 85 },
                ].map((item) => (
                  <div key={item.label} className={`flex items-center gap-2 transition-colors ${item.done ? "text-fuchsia-300" : "text-white/30"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.done ? "bg-fuchsia-400" : "bg-white/20"}`} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: Video Result ── */}
        {step === "video-result" && resultVideoUrl && (
          <div className="grid lg:grid-cols-5 gap-10">
            <div className="lg:col-span-3">
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">Your Model Video</h3>
              <div className="relative rounded-2xl overflow-hidden border border-fuchsia-500/30 shadow-2xl shadow-fuchsia-500/10">
                <video src={resultVideoUrl} className="w-full rounded-2xl" controls autoPlay loop muted />
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={downloadVideo}
                  className="flex-1 py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Video
                </button>
                <button
                  onClick={reset}
                  className="flex-1 py-3 rounded-xl bg-fuchsia-600/80 hover:bg-fuchsia-500 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Start Over
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-5">
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Summary</h3>

              {resultImage && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs text-white/40 mb-3 uppercase tracking-wider font-semibold">Source Photo</p>
                  <div className="relative rounded-xl overflow-hidden aspect-[3/4]">
                    <Image src={resultImage} alt="Model photo" fill className="object-cover" />
                  </div>
                  <button
                    onClick={downloadResult}
                    className="mt-3 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Photo
                  </button>
                </div>
              )}

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Film className="w-4 h-4 text-fuchsia-400" />
                  <span className="text-xs font-semibold text-fuchsia-300 uppercase tracking-wider">Generation Info</span>
                </div>
                <ul className="space-y-1.5 text-xs text-white/50">
                  <li className="flex justify-between"><span>Model</span><span className="text-white/70">Kling v2.6 Pro</span></li>
                  <li className="flex justify-between"><span>Orientation</span><span className="text-white/70">video</span></li>
                  <li className="flex justify-between"><span>Face swap</span><span className="text-white/70">Fal.ai</span></li>
                  <li className="flex justify-between"><span>Analysis</span><span className="text-white/70">Gemini 2.0 Flash</span></li>
                  {motionPrompt && (
                    <li className="pt-2 border-t border-white/10">
                      <span className="block text-white/30 mb-1">Prompt</span>
                      <span className="text-white/60 italic">{motionPrompt}</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
