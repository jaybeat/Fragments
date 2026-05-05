# Mentors — Project Context for Claude Code

## What This Project Is

**Mentors** 是一个**按问题搜索导师智慧片段**的音频产品。

很多人(包括项目作者本人)在刷短视频时被乔布斯、芒格、马斯克、巴菲特这类"看清问题本质的人"的某段话点醒,想保存下来,以后遇到类似困境时再听一次。但现实是收藏夹越攒越乱,真正需要时找不到。

Mentors 解决的是这个——**把精选导师的真实演讲/访谈片段,按问题(question)、洞见(insight)、领域(domain)结构化地组织起来,用户带着具体困境来,听导师用他们自己的原话回应你。**

关键约束:**永远是某个真人在某个真实场合说过的原话,绝不让 AI 拼凑/模仿/总结成"导师风格的回答"。**


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

### 里程碑 1:内容基建 ✅ (当前已完成)
- 拿到第一位导师(乔布斯)的两段经典内容
- Pipeline:fetch-transcript → segmenter (T/P 切分 + question + insight + domain 标注)
- 单期播放器(逐字高亮 + 章节)作为**单片段消费体验**的原型

**当前状态判断:** 内容底座基本就绪,但 1 位导师 × 2 期内容,**对路由质量不够**——任何搜索都很可能匹配不到。下一步必须是扩内容,不是做搜索 UI。

### 里程碑 2:精选内容扩充
- 乔布斯扩充到 5-8 段代表内容
- 加入 2-3 位精选导师(从芒格 / 马斯克 / 巴菲特里挑)
- 每位 3-5 段,P-segment 总数到 ~80-150
- **每位导师作者亲自挑、亲自把关**

### 里程碑 3:对话式路由主功能 (v1 内测,PWA 形态)
- 对话/搜索输入框
- LLM 路由:用户输入 → 匹配 P-segment 的 `question` 字段(向量召回 + 重排)
- 结果页:候选片段卡片(导师头像 + question + insight 摘要 + 时长) + 一两句"为什么推荐"
- 点进去 = 当前的单片段播放器(已有)
- **从 v1 起就是 PWA**:vite-plugin-pwa + Service Worker + Manifest,加到主屏幕、媒体锁屏控件、内容更新无需 App Store 审核
- **明确不做:** AI 总结、AI 模仿、用户系统、收藏

**v1 验证的核心问题:** "用户带着真实困境来,能不能找到他想听的片段?"

### 里程碑 4:导师页 + 主题页 (v1.1)
- **导师页**(优先):简介 + 代表演讲 + 所有片段(按 domain 分组)
- **主题页**:12 类 domain 聚合所有导师片段
- 首页 = 搜索框 + 导师入口 + 主题入口

### 里程碑 5:用户层 + 收藏 (v1.2)
- 用户登录 + 收藏片段 + 笔记 + "我的收藏"
- 解决"刷到想保存、需要时找不到"的真实痛点

### 里程碑 6:跨语言 (v2)
- 双语字幕同步
- 用户用中文搜索能匹配英文导师片段(LLM 翻译 query 后路由)
- 听原音 + 看翻译

## Out of Scope (Don't Build)

这些是**看起来合理但明确不做**的功能,做了会让产品偏离核心:

- ❌ **AI 模仿导师回答** —— "如果乔布斯在,他会怎么回答你"。**这是绝对红线**,违反"永远真人原话"的核心原则。
- ❌ **UGC 导师** —— 用户提交导师 / 社区扩充导师库。会稀释精选感和品味,Mentors 的价值有一部分来自"作者亲自挑"。
- ❌ **AI 总结片段** —— "乔布斯主要说了……"。处于"真人原话"原则的边缘地带,先不碰。如果未来做,只做客观摘要不做观点提炼。
- ❌ **社交 / 分享 / 评论** —— 把产品从"客厅里的智者"推向"社区",改变调性。
- ❌ **每日推送 / 金句通知** —— Mentors 是"用户需要时来找它",不是"它来找用户"。不做主动打扰。
- ❌ **多模态生成**(卡片图、短视频、引用图) —— 营销侧可能有用,但不是产品核心。

## Known Tech Debt

- **subtitle 字段当前是手填**,segmenter 不生成 subtitle,lost-interview 还是 `"TBD"`。计划在做导师页(里程碑 4)时一并处理——届时 subtitle 是导师页/片段卡片的展示元素,需要解决方案。
- **chapters 和 t_segments 双轨并存**:Player 优先用 t_segments,chapters 只作 fallback。后续新内容统一走 segmenter pipeline 后,chapters 字段可以从 Episode 接口移除。
- **Waveform 是噪声生成**:YouTube iframe 跨域,Web Audio AnalyserNode 读不到音频流。短期不解决——做 v1 路由功能更优先;长期如果自托管音频或换成 SoundCloud 这类支持 CORS 的源,可以做真实波形。
- **Tokenize 用线性插值分配 word 时间**:没有 word-level Whisper 数据。当前在演讲 / 访谈这种节奏稳定的内容上够用,但快语速或停顿不规律的导师(可能未来加入)会暴露问题。

## Working Style with Claude Code

基于这个项目的特点,以下是希望 Claude Code **遵守**的协作约束:

- **优先扩内容,不要急着做搜索 UI**:在内容池到 ~80-150 个 P-segment 之前,搜索体验注定不好。任何"我们来搭个搜索吧"的提议都该先被反问"内容够不够"。
- **不要主动建议引入 AI 生成内容**:任何"让 LLM 总结一下、改写一下、模仿一下"的建议都需要明确拒绝,除非是路由 / 轻引导用途(决定推荐哪个片段、写一两句"为什么推荐")。
- **不要主动建议加测试覆盖率 / CI / 类型严格化**:这是个内容驱动的早期产品,工程严谨度的优先级低于内容质量和路由准确度。已有的 vitest / eslint / tsc 够用。
- **不要主动重构现有代码**:特别是 `useYouTubePlayer`、`Tokenize`、`normalizeEpisode` 这几块——它们看起来朴素但都是为了应对 YouTube iframe 的具体限制。在没有明确功能需求时不要"优化"它们。
- **不要主动建议换技术栈**:Vite + React + vanilla CSS + Python segmenter 是当前合适的组合。任何"换 Next.js"、"换 Tailwind"、"用 Astro 更好"的建议都需要先被反问"它解决了我们当前的什么具体问题"。
- **新功能默认问"这服务于哪个里程碑"**:如果不能对应到上面 6 个里程碑里的某一个,大概率不该做或不该现在做。
- **PWA 相关决策从里程碑 3 开始就要考虑**:路由、缓存策略、离线行为、Service Worker 的更新策略,不要等到最后才补。

---

# Repository Architecture

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-page audio player (Vite + React + TypeScript) inspired by [Claudio FM](https://mmguo.dev/claudio-fm/). Audio streams from YouTube via the IFrame Player API; a word-level synced transcript highlights the spoken text in real time, and a procedural canvas waveform reacts to playback.

Currently ships two curated episodes:
- `jobs-stanford` — Steve Jobs Stanford Commencement 2005
- `jobs-lost-interview` — Steve Jobs The Lost Interview

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
npm run fetch-transcript -- <videoId> --output <path> --speaker "<name>" [--start-time <sec>]
npm run segmenter -- --episode-id <id> [--from-step N] [--force]
```

`npm run segmenter` is Python — it requires `pip install -r scripts/segmenter/requirements.txt` (PyYAML, sentence-transformers for the optional similarity check) and `GEMINI_API_KEY` in `.env`. The Node pipelines also read `HTTPS_PROXY` / `HTTP_PROXY` (Node 20's built-in fetch ignores the env var; `fetch-transcript` injects it via undici's `ProxyAgent`).

## Architecture

### State & data flow

`src/App.tsx` orchestrates: holds a `useReducer` (`PlayerState`) and mounts a hidden YouTube iframe via `useYouTubePlayer`. A `useRAF` loop polls `getCurrentTime()` and dispatches `TICK` actions.

State splits across two contexts in `src/PlayerContext.tsx`:
- **`PlayerContext`** — read-only state (`currentTime`, `duration`, `isPlaying`, `episodeId`, `tweaks`) + `dispatch`
- **`ControlsContext`** — imperative controls (`play`, `pause`, `seekTo`) backed by the YouTube player

Components consume via `usePlayer()` / `useControls()`.

### YouTube integration

`src/hooks/useYouTubePlayer.ts` injects the IFrame API once, mounts a hidden `320×200` iframe (`opacity: 0.01`, off-screen — browsers pause if it's fully invisible or too small), and exposes `play / pause / seekTo / getCurrentTime / getDuration / isReady / isPlaying`. On episode change it destroys the player and creates a new one. Autoplay is blocked until first user gesture; the app retries autoplay on initial click/key/touch.

### Transcript & timing

Episode data lives in `src/data/episodes/<id>.analyzed.json` — these are the **finalized** files produced by the segmenter. The raw `<id>.json` files (output of `fetch-transcript`) are NOT directly imported by the React app.

- `src/data/episodes.ts` imports the `*.analyzed.json` files and runs `normalizeEpisode`, which adds `episode.startTime` to every turn / chapter / t_segment / p_segment time so all downstream code can compare against absolute YouTube `getCurrentTime()`.
- `src/lib/tokenize.ts` linearly distributes words across the interval between consecutive turn `start` times. This produces per-word `start`/`end` without word-level Whisper data.
- `src/components/Transcript.tsx` renders tokenized turns and applies `.said` / `.current` / `.future` classes from `state.currentTime`.

### Chapter markers in the player

`src/components/Player.tsx` renders chapter labels on the progress bar. **It prefers `t_segments` over `chapters`**: T-segments (from the segmenter) are mapped to `Chapter`-shaped objects (`topic → title`, `summary → description`); the legacy `chapters[]` array is only used as a fallback when no T-segments exist. P-segments are persisted in the episode JSON but are not currently rendered (reserved for a future "search by question" feature).

### Waveform

`src/components/Waveform.tsx` is a procedural canvas animation. The YouTube iframe is cross-origin, so Web Audio's AnalyserNode cannot read the audio stream — the waveform is noise-based; only its animation speed scales with `isPlaying`.

### Styling

Single global stylesheet (`src/styles.css`) ports the reference site's CSS nearly verbatim. Class names (`.stage`, `.card`, `.header`, `.turn`, `.word.current`, `.player-chapter-label`, etc.) match the original so visual fidelity can be checked side-by-side. Tweakable values (background hue, blur, header tone) are applied as inline styles in `Stage.tsx` / `Header.tsx`.

## Data pipelines

Two CLI pipelines feed the React app. **The app only loads `*.analyzed.json`**, so a complete run is fetch-transcript → segmenter.

### `npm run fetch-transcript` — YouTube → raw episode JSON

`scripts/fetch-transcript.ts` (entry) + `scripts/lib/youtube-api.ts` (InnerTube ANDROID v20.10.38 client + srv3/classic XML parsers) + `scripts/lib/merge-turns.ts` (sentence-level Turn merger).

- Custom InnerTube client because the `youtube-transcript` lib silently picks the auto-generated track when both auto and manual tracks share a `languageCode`. ASR auto-captions are lowercase / unpunctuated. `pickTrack` defaults to `preferManual=true`; `--list-tracks` shows all tracks; `--prefer-auto` opts in to ASR.
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

1. Fetch the captions:
   ```bash
   npm run fetch-transcript -- <youtubeUrl> --output src/data/episodes/<id>.json --speaker "Speaker Name"
   ```
2. Hand-edit `<id>.json` if needed (set `title` with `<br>` for line break, fill `speakerAvatar` path, adjust `startTime`/`endTime` to trim).
3. Add a speaker avatar SVG to `public/avatars/<name>.svg`.
4. Run the segmenter to produce the analyzed file the app actually loads:
   ```bash
   npm run segmenter -- --episode-id <id>
   ```
5. Register in `src/data/episodes.ts`: import `<id>.analyzed.json` and add to the `EPISODES` array.

## Key constraints

- `tsconfig.json` has `noUnusedLocals` and `noUnusedParameters` enabled — unused imports/vars fail the build.
- `tsconfig.scripts.json` is a separate config so `tsc -b` in the frontend build does not compile the Node CLI scripts under `scripts/`.
- All times in episode JSON are stored relative to `startTime`; `normalizeEpisode` in `src/data/episodes.ts` is the single place that converts them to absolute YouTube timestamps. Don't double-add the offset.
- `subtitle` in episode JSON is required (`Episode` interface), used by `EpisodeMeta.tsx` and `Tweaks.tsx`. Currently lost-interview shows `"TBD"` because the segmenter doesn't generate subtitles — edit the JSON manually if you need a real one.