# AI Lo‑Fi Beats Generator (Nosana Agent Challenge)
**Built with Mastra + Next.js + Tone.js — Deployable to Nosana**

![Agent](./assets/NosanaBuildersChallenge03.jpg)

This is an AI music agent that generates lo‑fi beats from natural‑language prompts. It features multi‑tool workflows (Producer mode), precise one‑step edits (Composer mode), real‑time UI updates via SSE, and in‑browser playback.

---

## 🔗 Submission Links
- Nosana Deployment: `https://dashboard.nosana.com/jobs/13e56HPBZz6Sn3eEm6wN6aKa34ibZbKN7iFapWqAa7Ni`
- Docker Hub Image: `nishbot/agent-challenge:latest`
- Video Demo: `https://youtu.be/u9sX8LmEtMk`
- Social Post: `https://x.com/BanakarNishant/status/1984033548735803473`

---

## 🔧 Tools & APIs

- Mastra (agent orchestration, tool calling)
- Google Gemini 2.5 Flash (via Mastra model config)
- Next.js 15 (App Router) + TypeScript
- Tone.js (browser audio; kick/snare/hihat and piano chords)
- SSE polling for real-time sync (`/api/track-updates`)
- File-backed state: `public/track.json`

---

## 🎵 Music System (What the Agent Generates)

### Moods (5)
- **sad**: C minor pentatonic; slow (≈75 BPM), dark; legato; soft velocities
- **melancholic**: minor pentatonic; slightly brighter than sad (≈78 BPM); legato
- **chill**: minor pentatonic; balanced (≈85 BPM); sustained notes; medium velocities
- **happy**: C major pentatonic; bright (≈95 BPM); staccato; higher velocities
- **upbeat**: major pentatonic; energetic (≈105 BPM); punchy staccato

Each mood defines:
- scale, chord progression, default bass roots
- synth feel: reverb, attack, release, brightness
- default `tempo`, `velocityRange`, `articulation`

### Rhythm Patterns (10)
`simple`, `sparse`, `active`, `shuffled` (swing), `dotted`, `offbeat`, `triplets`, `syncopated`, `steady`, `half_time`

Patterns are intensity arrays (0=rest, 0.1–0.9=ghost/dynamics, 1=accent), expanded to pattern length.

### Bass Styles (5)
- `root` (default): sustained root notes following chord changes
- `walking`: stepwise motion through the scale
- `arpeggio`: chord tones transposed to bass register (2 octaves down)
- `octaves`: alternating between root and its octave
- `pedal`: sustained root, ignores chord changes

### Piano Modes
- `chords` (default): returns arrays of chord notes (e.g. `["C4","Eb4","G4"]`)
- `melody`: single‑note line, 70% chord tones + 30% scale passing tones

### Drums
- 16‑step kick/snare/hihat patterns per mood with `intensity: low|medium|high`
  - sad: minimal backbeat, soft hats
  - chill: syncopated lo‑fi kick, laid‑back snare
  - happy/upbeat: bouncier/four‑on‑the‑floor patterns, brighter hats

---

## ⚙️ How Music Generation Works (Tool Calls)

### Producer Mode (multi‑step, creative)
1) Interpret vibe → pick `mood`, `rhythm`, `tempo`
2) `createPattern` (e.g., intro/verse)
3) `addTrackToPattern` (drums) → uses `generateDrumPattern(mood)`
4) `addTrackToPattern` (piano chords or melody) → `generateNotes` or `generateMelody`
5) `addTrackToPattern` (bass) → `generateBassLine(mood, rhythm, style)`
6) Repeat 2–5 for additional sections (verse/chorus)
7) `updateTimeline(["intro","intro","verse","verse"])`

Each tool writes to `public/track.json`; the UI receives updates via SSE and reflects changes immediately.

### Composer Mode (single precise step)
1) Always `getComposition` first to read current state
2) Execute exactly one action:
   - `addTrackToPattern` (e.g., add drums to intro)
   - `updatePatternProperties` (e.g., change tempo/length)
   - `removeTrackFromPattern`, `clearTimeline`, etc.

---

## 🧰 Tools Reference (13 tools)

### Patterns
- `createPattern({ patternName?, tempo?, length? })`
  - Creates a section; auto‑names (intro/verse/chorus/…) if not provided
- `updatePatternProperties({ patternName, tempo?, length? })`
  - Change per‑pattern tempo/length
- `duplicatePattern({ patternName, newPatternName })`
  - Copies a pattern under a new name
- `deletePattern({ patternName })`
  - Removes a pattern
- `deleteAllPatterns()`
  - Clears all patterns (keeps track defaults)

### Tracks
- `addTrackToPattern({ patternName, instrument, mood?, rhythm?, trackType?, bassStyle? })`
  - Instruments: `piano`, `bass`, `drums`
  - Piano: `chords` (default) or `melody`
  - Bass styles: `root`, `walking`, `arpeggio`, `octaves`, `pedal`
- `updateTrackProperties({ patternName, instrument, volume })`
  - Sets volume (0–1)
- `removeTrackFromPattern({ patternName, instrument })`
  - Deletes an instrument from a pattern

### Timeline
- `updateTimeline({ timeline: string[] })`
  - Arranges patterns into a full song order
- `addPatternToTimeline({ patternName, position? })`
  - Inserts a pattern at a position
- `removePatternFromTimeline({ patternName?, position? })`
  - Removes by name or index
- `clearTimeline()`
  - Empties the arrangement

### View
- `getComposition()`
  - Returns the entire `track.json` composition state

---

## 🧠 Two Modes

- **Producer Mode (Creative, multi‑step)**
  - Turns vibes like “I want to relax” into full tracks (patterns + drums + piano + bass + timeline)
  - Max 20 steps, automatic decisions for mood, rhythm, tempo, instrument choices
- **Composer Mode (Precise, one step)**
  - Executes a single action like “add drums to intro” or “make verse faster”
  - Always calls `getComposition` first, then performs one exact tool call

---

## 🔊 Real‑time UX

- Tools write to `public/track.json`
- SSE endpoint (`/api/track-updates`) polls the file every 100 ms
- UI reloads the track on each change (unless audio is playing)
- “Tool Execution History” shows a clean, chronological list after completion

---

## 🧱 Architecture

High‑level flow
- The frontend sends a natural‑language prompt to `POST /api/music`.
- The Mastra `musicAgent` decides mode (Producer/Composer) and calls tools.
- Each tool mutates `public/track.json` using a file mutex (`withLock`).
- The UI listens to `/api/track-updates` (SSE polling) and reloads the track when it changes.
- `AudioEngine` (Tone.js) renders the updated composition in the browser.

Key components
- `music/route.ts` — gateway to the agent; applies the Producer/Composer prompt strategies, returns tool history for the UI.
- `tools/shared/musicGeneration.ts` — all musical rules: moods, scales, chords, rhythm patterns, bass styles, drum patterns, and generators.
- `tools/*` — 13 tools that create/modify patterns, tracks and timeline; every write persists to `public/track.json`.
- `page.tsx` — main UI; mode switch, timeline visualization, SSE client, and transport controls.
- `ToolCallsDisplay.tsx` — summary bar + full history modal (React Portal) showing ordered tool calls with durations.
- `AudioEngine.ts` — Tone.js playback with three drum voices and chord playback.

State & sync
- Composition is a single JSON file: `public/track.json`.
- SSE endpoint (`/api/track-updates`) polls the file mtime every 100 ms to emit `update` events.
- The UI reloads the track unless audio is currently playing to avoid glitches.

```
src/
  app/
    api/
      music/route.ts           # REST gateway to the musicAgent; applies Producer/Composer strategies and returns tool history
      track-updates/route.ts   # SSE endpoint that polls public/track.json mtime and emits { type: "update" }
      session/new/route.ts     # Resets public/track.json to a clean composition for "New Session"
    ToolCallsDisplay.tsx       # Tool execution summary bar + full History modal (React Portal)
    page.tsx                   # Main UI: mode toggle, transport, timeline view, SSE client, and playback wiring
  lib/AudioEngine.ts           # Tone.js playback engine (kick/snare/hihat synths; chord playback for piano)
  mastra/
    agents/index.ts            # musicAgent definition/model config; registers and exposes the 13 tools
    tools/*                    # Implementations of pattern/track/timeline/view tools (all mutate track.json under a file lock)
    tools/shared/*             # musicGeneration (moods/scales/rhythms/bass styles) + utils (read/write/withLock)
public/track.json              # Single source of truth for the composition; read by UI and written by tools
```

---

## 🚀 Run Locally

```bash
pnpm i

pnpm run dev:ui      # Start UI (port 3000)
pnpm run dev:agent   # Start Mastra agent (port 4111)
```

Open http://localhost:3000 for the frontend.
Open http://localhost:4111 for the Mastra Agent Playground.

### Choose your LLM

#### A) Shared Nosana Endpoint (recommended)
```env
OLLAMA_API_URL=https://3yt39qx97wc9hqwwmylrphi4jsxrngjzxnjakkybnxbw.node.k8s.prd.nos.ci/api
MODEL_NAME_AT_ENDPOINT=qwen3:8b
```

#### B) Local Ollama
```bash
ollama pull qwen3:0.6b
ollama serve
```
```env
OLLAMA_API_URL=http://127.0.0.1:11434/api
MODEL_NAME_AT_ENDPOINT=qwen3:0.6b
```

#### C) OpenAI / Gemini (used in demo)
```env
OPENAI_API_KEY=your-key-here
```

---

## 🐳 Build & Publish Docker Image

```bash
docker build -t your_username/nosana-mastra-agent:latest .
docker run -p 3000:3000 your_username/nosana-mastra-agent:latest
docker login -u <your_username>
docker push your_username/nosana-mastra-agent:latest
```

---

## ⚡ Deploy to Nosana

1) Open the [Nosana Dashboard](https://dashboard.nosana.com/deploy)
2) Load job definition `agent-challenge/nos_job_def/nosana_mastra_job_definition.json`
3) Set your Docker image:

```json
{
  "image": "your_username/nosana-mastra-agent:latest"
}
```

4) Select a GPU, then Deploy
5) Visit the app URL when the job is running

### CLI (alternative)
```bash
npm install -g @nosana/cli
nosana job post --file ./nos_job_def/nosana_mastra_job_definition.json --market nvidia-3090 --timeout 30
```

---

## 🧩 Key Files

```
agent-challenge/
  src/app/api/music/route.ts            # Agent endpoint (Producer/Composer prompts)
  src/app/api/track-updates/route.ts    # SSE polling for realtime sync
  src/app/api/session/new/route.ts      # Reset track.json (New Session)
  src/app/ToolCallsDisplay.tsx          # Summary bar + Tool History modal (Portal)
  src/app/page.tsx                      # Frontend UI
  src/lib/AudioEngine.ts                # Tone.js playback engine
  src/mastra/tools/*                    # 13 tools
  public/track.json                     # Composition state
```

---

## 🧪 Quick Usage

1) Click 🆕 New Session
2) Producer: enter “I want to relax” → Watch UI update in real time
3) Composer: enter “add drums to intro” → Single precise edit
4) Click “View Details” → Inspect tool execution history
5) Click ▶ Play → Hear the result

---

## ✅ Submission Checklist

- [x] Agent with Tool Calling (13 tools)
- [x] Frontend Interface
- [x] Deployed on Nosana
- [x] Docker Container
- [x] Video Demo
- [x] Updated README
- [x] Social Media Post

## 🔐 Environment Notes

The demo uses Gemini 2.5 Flash via Mastra model config. You can switch providers in `src/mastra/agents/index.ts` and `.env`.

## 📝 License

MIT — see `LICENSE`.