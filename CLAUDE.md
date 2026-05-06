# Mentors — Project Context for Claude Code

## What This Project Is

**Mentors** 是一个**按问题搜索导师智慧片段**的音频产品。

很多人(包括项目作者本人)在刷短视频时被乔布斯、芒格、马斯克、巴菲特这类"看清问题本质的人"的某段话点醒,想保存下来,以后遇到类似困境时再听一次。但现实是收藏夹越攒越乱,真正需要时找不到。

Mentors 解决的是这个——**把精选导师的真实演讲/访谈片段,按问题(question)、洞见(insight)、领域(domain)结构化地组织起来,用户带着具体困境来,听导师用他们自己的原话回应你。**

关键约束:**永远是某个真人在某个真实场合说过的原话,绝不让 AI 拼凑/模仿/总结成"导师风格的回答"。**

## Core Value Proposition

> **当你卡在一个问题上时,听你信任的智者本人,用他自己的原话,谈过这件事。**

任何不服务于这一句的功能都该被砍。

## Mental Model: Where Mentors Sits in the Ecosystem

Mentors **不和短视频平台竞争注意力**(它们是发现入口,负责"点燃")。
Mentors **不和播客平台竞争消费时长**(它们是连续陪伴消费,Mentors 是目的性精准消费)。

**Mentors 的位置是"用户在别处被点燃后,来这里结构化地找到、保存、再次取用"的中间层。**

任何想把 Mentors 推向"刷"或"陪伴"形态的功能,大概率走错了方向。

## Core User Scenarios

按优先级:

1. **A — 对话式入口(主):** 用户带着具体困境来,用对话/搜索的方式说出状态(比如"创业初期不知道先打磨产品还是先发布"),系统路由到合适的导师 + 片段,用一两句话说"为什么推荐这个",**让用户选听谁**。听到的是真人原话。
2. **D — 导师入口(次主):** 用户崇拜某位导师,点进他的页面,看到简介 + 代表演讲 + 所有切好的片段(按 domain 分组),可以从片段进入,也可以听完整演讲。
3. **B — 主题入口(次):** 用户没有具体困境,想浏览"这些人怎么聊'产品打磨'这个主题",像逛书架一样探索。

## Product Tone

- **客厅里的智者朋友**,不是搜索引擎,不是 AI 助手,不是社区
- **精选感**——每位导师都是作者亲自挑选、亲自把关的,这本身就是品牌的一部分
- **克制**——LLM 只做"路由"和"轻引导"(为什么推荐这个片段),**绝不当主持人,不评论导师的话,不帮用户综合**
- **真实**——所有片段必须可溯源到具体视频和时间戳,不允许 AI 生成或合成的内容混入

## Where This Project Is Going

**当前阶段:里程碑 2 — 精选内容扩充**(Pipeline 已就绪,目标是把 P-segment 总数从 ~10 扩到 80-150,覆盖 3-4 位导师,然后才进入搜索 UI)

**详细路线图见 `docs/ROADMAP.md`。** 默认不读,只在明确讨论"下一步做什么"或"长期方向"时参考。

## Out of Scope (Don't Build)

这些是**看起来合理但明确不做**的功能,做了会让产品偏离核心:

- ❌ **AI 模仿导师回答** —— "如果乔布斯在,他会怎么回答你"。**这是绝对红线**,违反"永远真人原话"的核心原则。
- ❌ **UGC 导师** —— 用户提交导师 / 社区扩充导师库。会稀释精选感和品味,Mentors 的价值有一部分来自"作者亲自挑"。
- ❌ **AI 总结片段** —— "乔布斯主要说了……"。处于"真人原话"原则的边缘地带,先不碰。如果未来做,只做客观摘要不做观点提炼。
- ❌ **社交 / 分享 / 评论** —— 把产品从"客厅里的智者"推向"社区",改变调性。
- ❌ **每日推送 / 金句通知** —— Mentors 是"用户需要时来找它",不是"它来找用户"。不做主动打扰。
- ❌ **多模态生成**(卡片图、短视频、引用图) —— 营销侧可能有用,但不是产品核心。

## Known Tech Debt

- **subtitle 字段当前是手填**,segmenter 不生成 subtitle。所有剧集的 subtitle 都是人工维护的;添加新导师时记得手填。
- **chapters 和 t_segments 双轨并存**:Player 优先用 t_segments,chapters 只作 fallback。后续新内容统一走 segmenter pipeline 后,chapters 字段可以从 Episode 接口移除。
- **Waveform 是噪声生成**:YouTube iframe 跨域,Web Audio AnalyserNode 读不到音频流。短期不解决——做 v1 路由功能更优先;长期如果自托管音频或换成 SoundCloud 这类支持 CORS 的源,可以做真实波形。
- **Tokenize 用线性插值分配 word 时间**:没有 word-level Whisper 数据。当前在演讲 / 访谈这种节奏稳定的内容上够用,但快语速或停顿不规律的导师(可能未来加入)会暴露问题。

## Working Style with Claude Code

### 协作模式

- **默认两段式工作流**:重要决策前,先开 "planning 模式" 对话(**只规划不写代码**),让 Claude Code 基于 CLAUDE.md + ROADMAP.md 推荐当前最该做的 1-2 件事;确认方向后再开**新对话**执行。不要在同一个对话里既规划又执行——规划阶段一旦开始写代码,判断力就停了。
- **详细路线图见 `docs/ROADMAP.md`**,默认不读,只在我明确说"看一下路线图"或讨论"下一步做什么 / 长期方向"时才参考。
- **每个执行对话的任务范围要明确**,不要"做着做着扩散"。如果发现需要做超出原任务的事,停下来问我,不要顺便做。

### 内容 vs 代码

- **优先扩内容,不要急着做搜索 UI**:在内容池到 ~80-150 个 P-segment 之前,搜索体验注定不好。任何"我们来搭个搜索吧"的提议都该先被反问"内容够不够"。
- **内容驱动型产品的瓶颈不在代码**:看起来"在写代码"的事不一定比"在加内容"的事重要。

### AI 使用边界

- **不要主动建议引入 AI 生成内容**:任何"让 LLM 总结一下、改写一下、模仿一下"的建议都需要明确拒绝,除非是路由 / 轻引导用途(决定推荐哪个片段、写一两句"为什么推荐")。
- **触碰 Out of Scope 红线时,先反问再做**:如果我提出的需求触碰了 Out of Scope 里的条款(尤其是 AI 模仿、AI 总结),先引用对应条款反问"你确定要做吗?",而不是直接开始实现。

### 工程约束

- **不要主动建议加测试覆盖率 / CI / 类型严格化**:这是个内容驱动的早期产品,工程严谨度的优先级低于内容质量和路由准确度。已有的 vitest / eslint / tsc 够用。
- **不要主动重构现有代码**:特别是 `useYouTubePlayer`、`Tokenize`、`normalizeEpisode` 这几块——它们看起来朴素但都是为了应对 YouTube iframe 的具体限制。在没有明确功能需求时不要"优化"它们。
- **不要主动建议换技术栈**:Vite + React + vanilla CSS + Python segmenter 是当前合适的组合。任何"换 Next.js"、"换 Tailwind"、"用 Astro 更好"的建议都需要先被反问"它解决了我们当前的什么具体问题"。

---

# Repository Architecture

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-page audio player (Vite + React + TypeScript) inspired by [Claudio FM](https://mmguo.dev/claudio-fm/). Audio streams from YouTube via the IFrame Player API; a word-level synced transcript highlights the spoken text in real time, and a procedural canvas waveform reacts to playback.

Currently ships five curated episodes across three mentors:
- `jobs-stanford` — Steve Jobs Stanford Commencement 2005
- `jobs-lost-interview` — Steve Jobs The Lost Interview
- `jobs-interview-1990` — Steve Jobs 1990 Interview (WGBH)
- `buffett-florida-1998` — Warren Buffett 1998 Florida Speech
- `feynman-fun-to-imagine` — Richard Feynman "Fun to Imagine"

## Common Commands

```bash
npm run dev               # Vite dev server (http://localhost:5173)
npm run build             # tsc -b + vite build → dist/
npm run preview           # Serve production build
npm test                  # vitest run (one-shot, no watch)
npm run lint              # eslint .
npm run format            # prettier --write .

# Run a single test file
npx vitest run src/lib/tokenize.test.ts

# Data pipelines (see "Data pipelines" below)
npm run fetch-transcript -- <videoId> --output <path> --speaker "<name>" [--start-time <sec>] [--translation-lang <code>]
npm run add-episode -- <videoUrl> --output <path> --speaker "<name>" [--start-time <sec>] [--translation-lang zh-Hans] [--auto-segment]
npm run segmenter -- --episode-id <id> [--from-step N] [--force]
```

`npm run segmenter` is Python — it requires `pip install -r scripts/segmenter/requirements.txt` (PyYAML, sentence-transformers for the optional similarity check) and `GEMINI_API_KEY` in `.env`. The Node pipelines also read `HTTPS_PROXY` / `HTTP_PROXY` (Node 20's built-in fetch ignores the env var; `fetch-transcript` injects it via undici's `ProxyAgent`).

## Architecture

### State & data flow

`src/App.tsx` orchestrates: holds a `useReducer` (`PlayerState`) and mounts a hidden YouTube iframe via `useYouTubePlayer`. A `useRAF` loop polls `getCurrentTime()` and dispatches `TICK` actions.

State splits across two contexts in `src/PlayerContext.tsx`:
- **`PlayerContext`** — read-only state (`currentTime`, `duration`, `isPlaying`, `episodeId`, `transcriptLang`, `theme`, `view`) + `dispatch`
- **`ControlsContext`** — imperative controls (`play`, `pause`, `seekTo`) backed by the YouTube player

`view: 'chapters' | 'transcript'` controls the primary content area in `Card.tsx`:
- `'chapters'` (default) — shows the full chapter/segment index (`ChapterList`)
- `'transcript'` — shows the current chapter card (`ChapterCard`) + full transcript (`Transcript`)

Components consume via `usePlayer()` / `useControls()`.

### YouTube integration

`src/hooks/useYouTubePlayer.ts` injects the IFrame API once, mounts a hidden `320×200` iframe (`opacity: 0.01`, off-screen — browsers pause if it's fully invisible or too small), and exposes `play / pause / seekTo / getCurrentTime / getDuration / isReady / isPlaying`. On episode change it destroys the player and creates a new one. Autoplay is blocked until first user gesture; the app retries autoplay on initial click/key/touch.

### Transcript & timing

Episode data lives in `src/data/episodes/<id>.analyzed.json` — these are the **finalized** files produced by the segmenter. The raw `<id>.json` files (output of `fetch-transcript`) are NOT directly imported by the React app.

- `src/data/episodes.ts` imports the `*.analyzed.json` files and runs `normalizeEpisode`, which adds `episode.startTime` to every turn / chapter / t_segment / p_segment time so all downstream code can compare against absolute YouTube `getCurrentTime()`.
- `src/lib/tokenize.ts` linearly distributes words across the interval between consecutive turn `start` times. This produces per-word `start`/`end` without word-level Whisper data.
- `src/components/Transcript.tsx` renders tokenized turns and applies `.said` / `.current` / `.future` classes from `state.currentTime`. It also supports bilingual display: when `turn.textCn` is present, a language toggle bar appears (英文原文 / 中文 / 双语对照). English mode keeps word-level highlighting; Chinese mode highlights the entire turn; both mode shows English on top and Chinese below. The active language is tracked in `PlayerState.transcriptLang` (default `'cn'`).

### Player layout & view switching

`src/components/Card.tsx` is the main card container. It conditionally renders the body based on `state.view`:

- **`'chapters'` (default)** — `EpisodeMeta` + `ChapterList` + `PlayerFooter`
- **`'transcript'`** — `EpisodeMeta` + `ChapterCard` + `Transcript` + `PlayerFooter`

`ChapterList` (new, extracted from `SegmentDrawer`) renders the full T-segment / P-segment index as a scrollable list with a timeline, active-highlighting, and click-to-seek. It is reused both as the default resident view and inside the full-screen `SegmentDrawer`.

`ChapterCard` shows the *currently active* T-segment (topic + P-segment list) and has an "全部 X 章 →" button that opens the `SegmentDrawer` overlay.

`PlayerFooter` contains `SegmentProgress` (progress bar with T-segment tick marks), playback controls (skip 15s / play-pause), and a `pf-view-toggle` button that switches between `'chapters'` and `'transcript'`.

`src/components/Player.tsx` exists but is **not currently mounted** — it was an earlier standalone player component.

### Waveform

`src/components/Waveform.tsx` is a procedural canvas animation. The YouTube iframe is cross-origin, so Web Audio's AnalyserNode cannot read the audio stream — the waveform is noise-based; only its animation speed scales with `isPlaying`.

### Styling

Single global stylesheet (`src/styles.css`) ports the reference site's CSS nearly verbatim. Class names (`.stage`, `.card`, `.header`, `.turn`, `.word.current`, `.player-chapter-label`, etc.) match the original so visual fidelity can be checked side-by-side. Tweakable values (background hue, blur, header tone) are applied as inline styles in `Stage.tsx` / `Header.tsx`.

## Data pipelines

Two CLI pipelines feed the React app. **The app only loads `*.analyzed.json`**, so a complete run is fetch-transcript → segmenter.

### `npm run fetch-transcript` — YouTube → raw episode JSON

`scripts/fetch-transcript.ts` (entry) + `scripts/lib/youtube-api.ts` (InnerTube ANDROID v20.10.38 client + srv3/classic XML parsers) + `scripts/lib/merge-turns.ts` (sentence-level Turn merger).

- Custom InnerTube client because the `youtube-transcript` lib silently picks the auto-generated track when both auto and manual tracks share a `languageCode`. ASR auto-captions are lowercase / unpunctuated. `pickTrack` defaults to `preferManual=true`; `--list-tracks` shows all tracks; `--prefer-auto` opts in to ASR.
- `--translation-lang <code>` fetches YouTube auto-translated captions via `&tlang=`. If YouTube returns 429 or fails, it automatically falls back to Google Translate batch API (free, no key needed) to populate `turn.textCn`.
- `--auto-segment` runs the Python segmenter automatically after writing the JSON, producing `<id>.analyzed.json` in one shot.
- Writes `EpisodeSkeleton` to `src/data/episodes/<id>.json` with `subtitle: "TBD"` (no automatic subtitle generation — see segmenter step2 below if you want to revive that).
- `--preserve-meta` replaces only `turns` and `duration`, keeping any existing `chapters` / `subtitle` / etc. After refreshing turns, segment indices in `02_t_segments.json` etc. become stale — re-run segmenter from step 2.

### `npm run segmenter` — raw episode JSON → analyzed.json (5 steps)

Python pipeline at `scripts/segmenter/`. Orchestrated by `run.py`; intermediate JSON written to `scripts/segmenter/intermediate/<id>/0N_*.json`; final `<id>.analyzed.json` written into `src/data/episodes/`.

| Step | File | LLM? | Output |
|---|---|---|---|
| 1. Tag speakers (Host / Guest / Speaker A…) | `steps/step1_tag_speakers.py` + `prompts/01_speaker_tagging.txt` | yes | `01_speakers.json` |
| 2. Segment T (topic groups, 7-13 per 60-90 min interview, ≥3 min each) | `steps/step2_segment_t.py` + `prompts/02_t_segmentation.txt` | yes | `02_t_segments.json` |
| 3. Segment P (insight units inside each T, ≥40 s, 0-3 per T) | `steps/step3_segment_p.py` + `prompts/03_p_segmentation.txt` | yes, **called once per T** | `03_p_segments.json` |
| 4. Quality check (P coverage, duration thresholds, "其他" domain ratio, optional question-similarity via sentence-transformers) | `steps/step4_quality_check.py` | no | `04_quality_report.json` |
| 5. Finalize (deep-copy episode + fill `who` from speaker map + strip turn-index fields + concat Guest-only `transcript` per P) | `steps/step5_finalize.py` | no | `<id>.analyzed.json` |

`run.py` skips a step if its output file exists; `--force` overrides; `--from-step N` jumps in mid-pipeline. The shared LLM client is `lib/llm_client.py` (raw `urllib.request` + 3-attempt exponential backoff + token tracking + `responseSchema` JSON mode at temperature 0.4). Fixed taxonomy + speaker name map + thresholds live in `config.yaml`.

P-segments carry `question` (search-style user phrasing) + `insight` + `domain` (12-class closed taxonomy + "其他") + `fine_tags` + a Guest-only `transcript` string. The pipeline's stated purpose is "为一个'按问题搜索人物访谈片段'的音频App做内容预处理" — the search UI itself is not yet built.

## Adding episodes

**One-shot pipeline (recommended):**
```bash
npm run add-episode -- <youtubeUrl> \
  --output src/data/episodes/<id>.json \
  --speaker "Speaker Name" \
  --start-time 22 \
  --translation-lang zh-Hans \
  --auto-segment
```
This fetches English captions, fetches/translates Chinese captions, writes the JSON, and runs the segmenter automatically.

**Manual steps (if you need fine control):**
1. Fetch the captions:
   ```bash
   npm run fetch-transcript -- <youtubeUrl> --output src/data/episodes/<id>.json --speaker "Speaker Name"
   ```
2. Hand-edit `<id>.json` if needed (set `title` with `<br>` for line break, fill `speakerAvatar` path, adjust `startTime`/`endTime` to trim).
3. Add a speaker avatar image to `public/avatars/<name>.svg` (or `.jpg`/`.webp`).
4. Run the segmenter to produce the analyzed file the app actually loads:
   ```bash
   npm run segmenter -- --episode-id <id>
   ```
5. Register in `src/data/episodes.ts`: import `<id>.analyzed.json` and add to the `EPISODES` array.

## Key constraints

- `tsconfig.json` has `noUnusedLocals` and `noUnusedParameters` enabled — unused imports/vars fail the build.
- `tsconfig.scripts.json` is a separate config so `tsc -b` in the frontend build does not compile the Node CLI scripts under `scripts/`.
- All times in episode JSON are stored relative to `startTime`; `normalizeEpisode` in `src/data/episodes.ts` is the single place that converts them to absolute YouTube timestamps. Don't double-add the offset.
- `subtitle` in episode JSON is required (`Episode` interface), used by `EpisodeMeta.tsx` and `Tweaks.tsx`. The segmenter does not generate subtitles — they must be hand-written when adding a new episode.