# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-page audio player app (Vite + React + TypeScript) that replicates the visual design of [Claudio FM](https://mmguo.dev/claudio-fm/). Audio is streamed from YouTube via the IFrame Player API, and a word-level synced transcript highlights the spoken text in real time.

Currently ships with one curated episode: **Steve Jobs — Stanford Commencement 2005**.

## Common Commands

```bash
npm run dev      # Start Vite dev server (http://localhost:5173)
npm run build    # Type-check + production build (outputs to dist/)
npm run preview  # Preview production build locally
```

There is no test runner, linter, or formatter configured.

## Architecture

### State & Data Flow

`src/App.tsx` is the orchestrator. It holds a `useReducer` state (`PlayerState`) and a hidden YouTube iframe via `useYouTubePlayer`. A `useRAF` loop polls `getCurrentTime()` from the iframe and dispatches `TICK` actions.

State is split across two contexts in `src/PlayerContext.tsx`:

- **`PlayerContext`** — read-only state (`currentTime`, `duration`, `isPlaying`, `episodeId`, `tweaks`) and `dispatch`
- **`ControlsContext`** — imperative playback controls (`play`, `pause`, `seekTo`) backed by the YouTube player

Components consume state from `PlayerContext` and actions from `ControlsContext` via `usePlayer()` / `useControls()`.

### YouTube Integration

`src/hooks/useYouTubePlayer.ts` dynamically injects the YouTube IFrame API script once, mounts a hidden `320×200` iframe (`opacity: 0.01`, off-screen), and exposes:

- `play()`, `pause()`, `seekTo(seconds)`
- `getCurrentTime()`, `getDuration()`
- `isReady`, `isPlaying`

On episode change, the hook destroys the old player and creates a new one for the new `videoId`.

### Transcript & Timing

Episode metadata lives in `src/data/episodes/*.json`. Each file contains line-level `turns` with `start` timestamps in seconds.

`src/lib/tokenize.ts` linearly distributes words across the interval between each turn's `start` and the next turn's `start`. This produces per-word `start`/`end` times without needing word-level Whisper data.

`src/data/episodes.ts` runs `normalizeEpisode`, which adds `episode.startTime` to every turn's `start`. This keeps all times absolute and aligned with YouTube's `getCurrentTime()`.

`src/components/Transcript.tsx` renders tokenized turns and assigns `.said` / `.current` / `.future` classes based on `state.currentTime`.

### Styling

A single global stylesheet (`src/styles.css`) ports the reference site's CSS nearly verbatim. Class names (`.stage`, `.card`, `.header`, `.turn`, `.word.current`, etc.) match the original so visual fidelity can be verified side-by-side. Tweakable values (background hue, blur, header tone) are applied via inline `style` props in `Stage.tsx` and `Header.tsx`.

### Waveform

`src/components/Waveform.tsx` draws a procedural Canvas animation. Because the YouTube iframe is cross-origin, the Web Audio AnalyserNode cannot access the audio stream. The waveform is therefore entirely noise-based; its animation speed scales with the `isPlaying` flag.

## Adding Episodes

1. Create `src/data/episodes/<id>.json` with shape:
   ```json
   {
     "id": "unique-id",
     "videoId": "YOUTUBE_VIDEO_ID",
     "title": "Speaker<br>Title",
     "subtitle": "Context",
     "speakerName": "Speaker Name",
     "speakerAvatar": "/avatars/<name>.svg",
     "startTime": 0,
     "duration": 900,
     "turns": [{ "who": "Speaker", "start": 0, "text": "First line." }]
   }
   ```
2. Import it in `src/data/episodes.ts` and add to the `EPISODES` array.
3. Add a speaker avatar SVG to `public/avatars/`.

## Key Constraints

- `tsconfig.json` has `noUnusedLocals` and `noUnusedParameters` enabled — unused imports or variables will fail the build.
- The YouTube iframe must remain in the DOM and reasonably sized; browsers often pause playback if the iframe is too small or fully invisible.
- Autoplay is blocked by most browsers until a user gesture. The app attempts autoplay on load and retries on the first click/key/touch if blocked.
