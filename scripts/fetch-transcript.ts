import * as fs from 'node:fs';
import * as path from 'node:path';
import { ProxyAgent, type Dispatcher } from 'undici';
import {
  getPlayerData,
  downloadImage,
  pickTrack,
  fetchTrackXml,
  parseTrackXml,
  CaptionError,
  VideoUnavailableError,
  CaptionsDisabledError,
  NoCaptionTracksError,
  LanguageNotAvailableError,
  type CaptionTrack,
  type VideoMeta,
} from './lib/youtube-api.ts';
import { mergeIntoTurns, type Turn } from './lib/merge-turns.ts';

interface Args {
  videoId: string;
  output?: string;
  startTime: number;
  endTime: number | undefined;
  speaker: string | undefined;
  lang: string;
  preferAuto: boolean;
  preserveMeta: boolean;
  overwrite: boolean;
  dryRun: boolean;
  maxDurSec: number;
  listTracks: boolean;
  noCache: boolean;
}

interface EpisodeSkeleton {
  id: string;
  videoId: string;
  title: string;
  subtitle: string;
  speakerName: string;
  speakerAvatar: string;
  startTime: number;
  duration: number;
  chapters?: unknown[];
  turns: Turn[];
}

const HELP = `Usage:
  npm run fetch-transcript -- <videoId|url> [options]

Required:
  <videoId|url>            YouTube video ID (11 chars) or full URL

Options:
  --output <path>          Write merged turns into this JSON file
  --start-time <seconds>   Trim leading caption offsets (e.g. 22 = drop intro applause)  [default: 0]
  --end-time <seconds>     Trim trailing content after this timestamp (seconds)            [default: none]
  --speaker <name>         Value to write into turn.who                                    [default: video author from YouTube]
  --lang <code>            Caption language preference                                     [default: "en"]
  --prefer-auto            Prefer YouTube auto-generated captions over manual              [default: false]
  --max-dur <seconds>      Max duration of a merged turn before forced break               [default: 15]
  --preserve-meta          When --output already exists, only replace the turns field     [default: false]
  --overwrite              Allow replacing an existing --output file (without --preserve-meta) [default: false]
  --dry-run                Print summary + sample turns; do not write any file             [default: false]
  --no-cache               Skip reading cached API responses                               [default: false]
  --list-tracks            List all caption tracks for the video and exit                  [default: false]
  -h, --help               Show this help

Examples:
  npm run fetch-transcript -- UF8uR6Z6KLc --list-tracks
  npm run fetch-transcript -- UF8uR6Z6KLc --dry-run --start-time 22 --speaker "Steve Jobs"
  npm run fetch-transcript -- UF8uR6Z6KLc --output src/data/episodes/jobs-stanford.json --start-time 22 --speaker "Steve Jobs" --preserve-meta
`;

function parseArgs(argv: string[]): Args {
  let videoId: string | undefined;
  let output: string | undefined;
  let startTime = 0;
  let endTime: number | undefined;
  let speaker: string | undefined;
  let lang = 'en';
  let preferAuto = false;
  let preserveMeta = false;
  let overwrite = false;
  let dryRun = false;
  let maxDurSec = 15;
  let listTracks = false;
  let noCache = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-h':
      case '--help':
        process.stdout.write(HELP);
        process.exit(0);
      case '--output':
        output = argv[++i];
        break;
      case '--start-time':
        startTime = Number(argv[++i]);
        break;
      case '--end-time':
        endTime = Number(argv[++i]);
        break;
      case '--speaker':
        speaker = argv[++i];
        break;
      case '--lang':
        lang = argv[++i];
        break;
      case '--max-dur':
        maxDurSec = Number(argv[++i]);
        break;
      case '--prefer-auto':
        preferAuto = true;
        break;
      case '--preserve-meta':
        preserveMeta = true;
        break;
      case '--overwrite':
        overwrite = true;
        break;
      case '--dry-run':
        dryRun = true;
        break;
      case '--no-cache':
        noCache = true;
        break;
      case '--list-tracks':
        listTracks = true;
        break;
      default:
        if (a.startsWith('--')) {
          throw new Error(`Unknown flag: ${a}`);
        }
        if (videoId) throw new Error(`Unexpected positional arg: ${a}`);
        videoId = a;
    }
  }
  if (!videoId) {
    process.stderr.write(HELP);
    throw new Error('videoId is required');
  }
  if (Number.isNaN(startTime) || startTime < 0) {
    throw new Error(`--start-time must be a non-negative number, got: ${startTime}`);
  }
  if (endTime !== undefined && (Number.isNaN(endTime) || endTime <= startTime)) {
    throw new Error(
      `--end-time must be a number greater than --start-time (${startTime}), got: ${endTime}`
    );
  }
  if (Number.isNaN(maxDurSec) || maxDurSec <= 0) {
    throw new Error(`--max-dur must be a positive number, got: ${maxDurSec}`);
  }
  return {
    videoId,
    output,
    startTime,
    endTime,
    speaker,
    lang,
    preferAuto,
    preserveMeta,
    overwrite,
    dryRun,
    maxDurSec,
    listTracks,
    noCache,
  };
}

function extractVideoId(input: string): string {
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  const m =
    input.match(/[?&]v=([A-Za-z0-9_-]{11})/) || input.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  throw new Error(`Could not extract a YouTube video ID from: ${input}`);
}

function fmtMmss(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

function summarize(turns: Turn[]): string {
  if (turns.length === 0) return '(no turns produced)';
  const lines: string[] = [];
  lines.push(`  turns: ${turns.length}`);
  const sample = (i: number) => {
    const t = turns[i];
    if (!t) return;
    const txt = t.text.length > 120 ? t.text.slice(0, 120) + '…' : t.text;
    lines.push(`  [${fmtMmss(t.start)}] ${txt}`);
  };
  const head = Math.min(3, turns.length);
  for (let i = 0; i < head; i++) sample(i);
  if (turns.length > 6) lines.push('  …');
  const tailStart = Math.max(head, turns.length - 3);
  for (let i = tailStart; i < turns.length; i++) sample(i);
  return lines.join('\n');
}

function describeTrack(t: CaptionTrack): string {
  const kind = t.kind === 'asr' ? 'auto' : 'manual';
  const name = t.displayName ? `"${t.displayName}"` : '(no name)';
  return `  - ${t.languageCode.padEnd(6)} [${kind}] ${name}`;
}

const CACHE_DIR = path.resolve(process.cwd(), 'scripts', 'cache');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isCacheStale(p: string): boolean {
  try {
    const stat = fs.statSync(p);
    return Date.now() - stat.mtimeMs > CACHE_TTL_MS;
  } catch {
    return true;
  }
}

function getCachedPlayer(videoId: string): { tracks: CaptionTrack[]; meta: VideoMeta } | undefined {
  const p = path.join(CACHE_DIR, `${videoId}.json`);
  if (!fs.existsSync(p) || isCacheStale(p)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as { tracks: CaptionTrack[]; meta: VideoMeta };
  } catch {
    return undefined;
  }
}

function setCachedPlayer(videoId: string, data: { tracks: CaptionTrack[]; meta: VideoMeta }): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, `${videoId}.json`), JSON.stringify(data, null, 2) + '\n');
}

function getCachedTrack(key: string): string | undefined {
  const p = path.join(CACHE_DIR, `${key}.xml`);
  if (!fs.existsSync(p) || isCacheStale(p)) return undefined;
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return undefined;
  }
}

function setCachedTrack(key: string, xml: string): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, `${key}.xml`), xml);
}

function cleanupCache(): void {
  if (!fs.existsSync(CACHE_DIR)) return;
  const now = Date.now();
  for (const entry of fs.readdirSync(CACHE_DIR)) {
    const p = path.join(CACHE_DIR, entry);
    try {
      const stat = fs.statSync(p);
      if (now - stat.mtimeMs > CACHE_TTL_MS) {
        fs.unlinkSync(p);
        process.stdout.write(`[fetch-transcript] cleaned stale cache: ${entry}\n`);
      }
    } catch {
      // ignore
    }
  }
}

function validateSkeleton(s: EpisodeSkeleton): void {
  const errors: string[] = [];
  if (!s.id || typeof s.id !== 'string') errors.push('id must be a non-empty string');
  if (!s.videoId || typeof s.videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(s.videoId))
    errors.push('videoId must be an 11-character YouTube ID');
  if (!s.title || typeof s.title !== 'string') errors.push('title must be a non-empty string');
  if (!s.speakerName || typeof s.speakerName !== 'string')
    errors.push('speakerName must be a non-empty string');
  if (typeof s.duration !== 'number' || s.duration <= 0)
    errors.push('duration must be a positive number');
  if (typeof s.startTime !== 'number' || s.startTime < 0)
    errors.push('startTime must be a non-negative number');
  if (!Array.isArray(s.turns) || s.turns.length === 0)
    errors.push('turns must be a non-empty array');
  else {
    for (let i = 0; i < s.turns.length; i++) {
      const t = s.turns[i];
      if (!t || typeof t.who !== 'string') errors.push(`turns[${i}].who must be a string`);
      if (typeof t?.start !== 'number') errors.push(`turns[${i}].start must be a number`);
      if (!t?.text || typeof t.text !== 'string')
        errors.push(`turns[${i}].text must be a non-empty string`);
    }
  }
  if (errors.length > 0) {
    throw new Error(`Episode validation failed:\n  - ${errors.join('\n  - ')}`);
  }
}

function reportError(err: unknown): never {
  if (err instanceof VideoUnavailableError) {
    process.stderr.write(`[fetch-transcript] ${err.message}\n`);
  } else if (err instanceof CaptionsDisabledError) {
    process.stderr.write(`[fetch-transcript] Captions disabled. ${err.message}\n`);
  } else if (err instanceof NoCaptionTracksError) {
    process.stderr.write(`[fetch-transcript] ${err.message}\n`);
  } else if (err instanceof LanguageNotAvailableError) {
    process.stderr.write(`[fetch-transcript] ${err.message}\n`);
  } else if (err instanceof CaptionError) {
    process.stderr.write(`[fetch-transcript] ${err.message}\n`);
  } else if (err instanceof Error) {
    process.stderr.write(`[fetch-transcript] ${err.stack ?? err.message}\n`);
  } else {
    process.stderr.write(`[fetch-transcript] Unknown error: ${String(err)}\n`);
  }
  process.exit(1);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const videoId = extractVideoId(args.videoId);

  const proxy =
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy;
  let dispatcher: Dispatcher | undefined;
  if (proxy) {
    process.stdout.write(`[fetch-transcript] using proxy: ${proxy}\n`);
    dispatcher = new ProxyAgent(proxy);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);

  try {
    cleanupCache();
    process.stdout.write(`[fetch-transcript] videoId=${videoId} lang=${args.lang}\n`);
    let tracks: CaptionTrack[];
    let meta: VideoMeta;
    const cachedPlayer = args.noCache ? undefined : getCachedPlayer(videoId);
    if (cachedPlayer) {
      tracks = cachedPlayer.tracks;
      meta = cachedPlayer.meta;
      process.stdout.write('[fetch-transcript] using cached player data\n');
    } else {
      const data = await getPlayerData(videoId, dispatcher, ctrl.signal);
      tracks = data.tracks;
      meta = data.meta;
      if (!args.dryRun) {
        setCachedPlayer(videoId, data);
      }
    }

    if (args.listTracks) {
      process.stdout.write(`[fetch-transcript] ${tracks.length} caption track(s):\n`);
      for (const t of tracks) process.stdout.write(describeTrack(t) + '\n');
      return;
    }

    const track = pickTrack(tracks, args.lang, !args.preferAuto);
    process.stdout.write(
      `[fetch-transcript] picked track: ${track.languageCode} ` +
        `[${track.kind === 'asr' ? 'auto' : 'manual'}] ` +
        `${track.displayName ? `"${track.displayName}"` : ''}\n`
    );

    const trackCacheKey = `${videoId}-${track.languageCode}-${track.kind ?? 'manual'}`;
    let xml = args.noCache ? undefined : getCachedTrack(trackCacheKey);
    if (xml) {
      process.stdout.write('[fetch-transcript] using cached caption XML\n');
    } else {
      xml = await fetchTrackXml(track.baseUrl, dispatcher, ctrl.signal);
      if (!args.dryRun) {
        setCachedTrack(trackCacheKey, xml);
      }
    }
    const segments = parseTrackXml(xml);
    process.stdout.write(`[fetch-transcript] parsed ${segments.length} caption segments\n`);

    if (segments.length === 0) {
      process.stderr.write('[fetch-transcript] No segments parsed.\n');
      process.exit(1);
    }

    let finalSpeaker = (args.speaker ?? meta.author) || 'Speaker';
    let turns = mergeIntoTurns(segments, {
      speaker: finalSpeaker,
      maxDurSec: args.maxDurSec,
      startTime: args.startTime,
      endTime: args.endTime,
    });

    process.stdout.write(`[fetch-transcript] merged into ${turns.length} turns\n`);
    process.stdout.write(summarize(turns) + '\n');

    if (args.dryRun) {
      process.stdout.write(
        `[fetch-transcript] meta: title="${meta.title}" author="${meta.author}" thumbnail=${meta.thumbnail} publishDate=${meta.publishDate ?? 'n/a'}\n`
      );
      process.stdout.write('[fetch-transcript] --dry-run: not writing any file\n');
      return;
    }
    if (!args.output) {
      process.stderr.write('[fetch-transcript] --output is required (or use --dry-run)\n');
      process.exit(1);
    }

    const outPath = path.resolve(args.output);
    const exists = fs.existsSync(outPath);

    if (exists && args.preserveMeta) {
      const original = JSON.parse(fs.readFileSync(outPath, 'utf-8')) as Record<string, unknown>;
      const preservedSpeaker =
        typeof original.speakerName === 'string' ? original.speakerName : undefined;
      if (preservedSpeaker && preservedSpeaker !== finalSpeaker) {
        finalSpeaker = preservedSpeaker;
        turns = mergeIntoTurns(segments, {
          speaker: finalSpeaker,
          maxDurSec: args.maxDurSec,
          startTime: args.startTime,
          endTime: args.endTime,
        });
        process.stdout.write(
          `[fetch-transcript] remerged turns with preserved speaker: ${finalSpeaker}\n`
        );
      }
      const newDuration = args.endTime
        ? Math.ceil(args.endTime - args.startTime)
        : meta.lengthSeconds
          ? Math.ceil(meta.lengthSeconds - args.startTime)
          : (original.duration as number);
      original.duration = newDuration;
      original.turns = turns;
      fs.writeFileSync(outPath, JSON.stringify(original, null, 2) + '\n', 'utf-8');
      process.stdout.write(
        `[fetch-transcript] wrote ${outPath} (turns + duration replaced; ${Object.keys(original).length - 2} other fields preserved)\n`
      );
      return;
    }

    if (exists && !args.overwrite) {
      process.stderr.write(
        `[fetch-transcript] ${outPath} already exists.\n` +
          `  Use --preserve-meta to keep existing chapters/title/etc and only replace turns,\n` +
          `  or --overwrite to fully replace the file.\n`
      );
      process.exit(1);
    }

    const id = path.basename(outPath, '.json');
    const subtitle = 'TBD';

    let speakerAvatar = '';
    if (meta.thumbnail) {
      try {
        const ext = path.extname(new URL(meta.thumbnail).pathname) || '.jpg';
        const thumbAbs = path.resolve(process.cwd(), 'public', 'avatars', `${id}${ext}`);
        await downloadImage(meta.thumbnail, thumbAbs, dispatcher, ctrl.signal);
        speakerAvatar = `/avatars/${id}${ext}`;
        process.stdout.write(`[fetch-transcript] thumbnail saved: ${thumbAbs}\n`);
      } catch (e) {
        process.stdout.write(
          `[fetch-transcript] warn: thumbnail download failed: ${(e as Error).message}\n`
        );
      }
    }

    const duration = args.endTime
      ? Math.ceil(args.endTime - args.startTime)
      : meta.lengthSeconds
        ? Math.ceil(meta.lengthSeconds - args.startTime)
        : Math.ceil((turns[turns.length - 1]?.start ?? 0) + 30);

    const skeleton: EpisodeSkeleton = {
      id,
      videoId,
      title: meta.title || 'TBD',
      subtitle,
      speakerName: finalSpeaker,
      speakerAvatar,
      startTime: args.startTime,
      duration,
      turns,
    };

    validateSkeleton(skeleton);

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(skeleton, null, 2) + '\n', 'utf-8');
    process.stdout.write(`[fetch-transcript] wrote ${outPath} (auto-filled)\n`);
  } finally {
    clearTimeout(timer);
  }
}

main().catch(reportError);
