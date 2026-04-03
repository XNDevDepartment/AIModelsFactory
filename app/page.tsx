"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, Sparkles, ArrowRight, RotateCcw, Download, Zap, Camera, User } from "lucide-react";
import Image from "next/image";

type Step = "upload" | "select-model" | "processing" | "result";

interface GeminiAnalysis {
  description: string;
  modelStyle: string;
  suggestions: string[];
}

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

export default function FaceSwapPage() {
  const [step, setStep] = useState<Step>("upload");
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userPhotoFile, setUserPhotoFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState<(typeof MODEL_PRESETS)[0] | null>(null);
  const [customModelImage, setCustomModelImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [geminiAnalysis, setGeminiAnalysis] = useState<GeminiAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const userPhotoInputRef = useRef<HTMLInputElement>(null);
  const customModelInputRef = useRef<HTMLInputElement>(null);

  const handleUserPhotoUpload = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setUserPhoto(e.target?.result as string);
      setUserPhotoFile(file);
      setError(null);
      setStep("select-model");
    };
    reader.readAsDataURL(file);
  }, []);

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
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setCustomModelImage(e.target?.result as string);
      setSelectedModel(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const runFaceSwap = async () => {
    if (!userPhoto) return;
    const targetImage = customModelImage || selectedModel?.image;
    if (!targetImage) {
      setError("Please select a model style or upload a custom model image.");
      return;
    }

    setStep("processing");
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 12, 88));
    }, 800);

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

      clearInterval(progressInterval);
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
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep("select-model");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setUserPhoto(null);
    setUserPhotoFile(null);
    setSelectedModel(null);
    setCustomModelImage(null);
    setResultImage(null);
    setGeminiAnalysis(null);
    setProgress(0);
    setError(null);
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = "ai-model-photo.png";
    a.click();
  };

  // suppress unused variable warning
  void isProcessing;
  void userPhotoFile;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">AI Models Factory</h1>
              <p className="text-xs text-white/40">Powered by Gemini + Fal.ai</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span>Google Gemini</span>
            <span className="text-white/20">·</span>
            <span>Fal.ai Face Swap</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-12">
          {[
            { key: "upload", label: "Upload Photo", icon: Camera },
            { key: "select-model", label: "Choose Style", icon: User },
            { key: "processing", label: "Processing", icon: Zap },
            { key: "result", label: "Your Model", icon: Sparkles },
          ].map((s, i, arr) => {
            const isActive = s.key === step;
            const isDone = arr.findIndex((a) => a.key === step) > i;
            const Icon = s.icon;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      isDone
                        ? "bg-violet-500 text-white"
                        : isActive
                        ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/40 scale-110"
                        : "bg-white/10 text-white/30"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-sm font-medium hidden sm:block transition-colors ${
                      isActive ? "text-white" : isDone ? "text-violet-400" : "text-white/30"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-white/20 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-8 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-5 py-4 text-sm">
            {error}
          </div>
        )}

        {/* STEP 1: Upload */}
        {step === "upload" && (
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                Become an AI Model
              </h2>
              <p className="text-white/50 text-sm">
                Upload your photo and we&apos;ll place your face into professional model shots — powered by Google Gemini and Fal.ai.
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
          </div>
        )}

        {/* STEP 2: Select Model */}
        {step === "select-model" && (
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">Your Photo</h3>
              <div className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 aspect-[3/4]">
                {userPhoto && (
                  <Image src={userPhoto} alt="Your photo" fill className="object-cover" />
                )}
                <button
                  onClick={() => { setStep("upload"); setUserPhoto(null); }}
                  className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white/70 hover:text-white rounded-lg p-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">Choose a Style</h3>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {MODEL_PRESETS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => { setSelectedModel(model); setCustomModelImage(null); }}
                    className={`relative rounded-xl overflow-hidden aspect-[3/4] border-2 transition-all duration-200 group ${
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
                      <p className="text-sm font-medium text-white/70">Upload custom model image</p>
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
                onClick={runFaceSwap}
                disabled={!selectedModel && !customModelImage}
                className="mt-5 w-full py-4 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate My Model Photo
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Processing */}
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
              <h2 className="text-2xl font-bold mb-2">Creating Your Model Photo</h2>
              <p className="text-white/40 text-sm">Fal.ai is swapping faces · Gemini is analyzing your shot</p>
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
                {[
                  { label: "Detecting face", done: progress > 20 },
                  { label: "Analyzing lighting", done: progress > 40 },
                  { label: "Swapping face (Fal.ai)", done: progress > 65 },
                  { label: "Gemini analysis", done: progress > 85 },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 transition-colors ${item.done ? "text-violet-300" : "text-white/30"}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.done ? "bg-violet-400" : "bg-white/20"}`} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Result */}
        {step === "result" && resultImage && (
          <div className="grid lg:grid-cols-5 gap-10">
            <div className="lg:col-span-3">
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">Your Model Photo</h3>
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
                    className="flex-1 py-2.5 rounded-xl bg-violet-600/80 backdrop-blur-sm hover:bg-violet-500 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Start Over
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-5">
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
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-violet-400" />
                  </div>
                  <p className="text-sm text-white/40">Gemini analysis unavailable — check your API key.</p>
                </div>
              )}

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
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
