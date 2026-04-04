# AI Models Factory

Upload your photo and become an AI model — your face swapped onto professional model shots, analyzed by Google Gemini.

**Powered by:** Google Gemini 2.0 Flash · Fal.ai Face Swap

---

## Setup

### 1. Get API keys

| Service | Where to get it |
|---|---|
| Google Gemini | https://aistudio.google.com/app/apikey |
| Fal.ai | https://fal.ai/dashboard/keys |

### 2. Configure environment

```bash
cp .env.example .env.local
# Fill in your keys in .env.local
```

`.env.local`:
```
GEMINI_API_KEY=your_gemini_api_key_here
FAL_KEY=your_fal_api_key_here
```

### 3. Run locally

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## Deploy to Vercel

### Option A — Vercel CLI (recommended)

```bash
npm install -g vercel

# Login
vercel login

# Deploy (production)
vercel --prod
```

When prompted, set the environment variables:
```
GEMINI_API_KEY=...
FAL_KEY=...
```

Or add them after deployment via the Vercel dashboard:
**Project → Settings → Environment Variables**

### Option B — Vercel Dashboard (no CLI)

1. Push this repo to GitHub
2. Go to https://vercel.com/new
3. Import the repository
4. Add environment variables in the UI:
   - `GEMINI_API_KEY`
   - `FAL_KEY`
5. Click **Deploy**

---

## How it works

1. **Upload** your photo (JPG, PNG, WEBP)
2. **Choose a style** — Fashion Editorial, Streetwear, Business Pro, Casual Cool, or upload your own model reference
3. **Generate** — Fal.ai swaps your face in, Gemini analyzes your look in parallel
4. **Download** your model photo and read the AI style analysis

---

## Project structure

```
app/
  page.tsx                   # Main UI (4-step flow)
  api/
    face-swap/route.ts       # Fal.ai face swap endpoint
    gemini-analyze/route.ts  # Gemini image analysis endpoint
```
