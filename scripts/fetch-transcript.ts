import * as fs from 'node:fs';
import * as path from 'node:path';
import { ProxyAgent, type Dispatcher } from 'undici';
import {
  getPlayerData,
  getChannelAvatar,
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
} from './lib/youtube-api.ts';
import { mergeIntoTurns, type Turn } from './lib/merge-turns.ts';
import { cleanSubtitle } from './lib/clean-subtitle.ts';

interface Args {
  videoId: string;
  output?: string;
  startTime: number;
  speaker: string | undefined;
  lang: string;
  preferAuto: boolean;
  preserveMeta: boolean;
  overwrite: boolean;
  dryRun: boolean;
  maxDurSec: number;
  listTracks: boolean;
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
  --speaker <name>         Value to write into turn.who                                    [default: video author from YouTube]
  --lang <code>            Caption language preference                                     [default: "en"]
  --prefer-auto            Prefer YouTube auto-generated captions over manual              [default: false]
  --max-dur <seconds>      Max duration of a merged turn before forced break               [default: 15]
  --preserve-meta          When --output already exists, only replace the turns field     [default: false]
  --overwrite              Allow replacing an existing --output file (without --preserve-meta) [default: false]
  --dry-run                Print summary + sample turns; do not write any file             [default: false]
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
  let speaker: string | undefined;
  let lang = 'en';
  let preferAuto = false;
  let preserveMeta = false;
  let overwrite = false;
  let dryRun = false;
  let maxDurSec = 15;
  let listTracks = false;

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
  if (Number.isNaN(maxDurSec) || maxDurSec <= 0) {
    throw new Error(`--max-dur must be a positive number, got: ${maxDurSec}`);
  }
  return {
    videoId,
    output,
    startTime,
    speaker,
    lang,
    preferAuto,
    preserveMeta,
    overwrite,
    dryRun,
    maxDurSec,
    listTracks,
  };
}

function extractVideoId(input: string): string {
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  const m = input.match(/[?&]v=([A-Za-z0-9_-]{11})/) || input.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
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
    process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
  let dispatcher: Dispatcher | undefined;
  if (proxy) {
    process.stdout.write(`[fetch-transcript] using proxy: ${proxy}\n`);
    dispatcher = new ProxyAgent(proxy);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);

  try {
    process.stdout.write(`[fetch-transcript] videoId=${videoId} lang=${args.lang}\n`);
    const { tracks, meta } = await getPlayerData(videoId, dispatcher, ctrl.signal);

    if (args.listTracks) {
      process.stdout.write(`[fetch-transcript] ${tracks.length} caption track(s):\n`);
      for (const t of tracks) process.stdout.write(describeTrack(t) + '\n');
      return;
    }

    const track = pickTrack(tracks, args.lang, !args.preferAuto);
    process.stdout.write(
      `[fetch-transcript] picked track: ${track.languageCode} ` +
        `[${track.kind === 'asr' ? 'auto' : 'manual'}] ` +
        `${track.displayName ? `"${track.displayName}"` : ''}\n`,
    );

    const xml = await fetchTrackXml(track.baseUrl, dispatcher, ctrl.signal);
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
    });

    process.stdout.write(`[fetch-transcript] merged into ${turns.length} turns\n`);
    process.stdout.write(summarize(turns) + '\n');

    if (args.dryRun) {
      process.stdout.write(
        `[fetch-transcript] meta: title="${meta.title}" author="${meta.author}" channelId=${meta.channelId} publishDate=${meta.publishDate ?? 'n/a'}\n`,
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
      const preservedSpeaker = typeof original.speakerName === 'string' ? original.speakerName : undefined;
      if (preservedSpeaker && preservedSpeaker !== finalSpeaker) {
        finalSpeaker = preservedSpeaker;
        turns = mergeIntoTurns(segments, {
          speaker: finalSpeaker,
          maxDurSec: args.maxDurSec,
          startTime: args.startTime,
        });
        process.stdout.write(`[fetch-transcript] remerged turns with preserved speaker: ${finalSpeaker}\n`);
      }
      original.turns = turns;
      fs.writeFileSync(outPath, JSON.stringify(original, null, 2) + '\n', 'utf-8');
      process.stdout.write(
        `[fetch-transcript] wrote ${outPath} (turns replaced; ${Object.keys(original).length - 1} other fields preserved)\n`,
      );
      return;
    }

    if (exists && !args.overwrite) {
      process.stderr.write(
        `[fetch-transcript] ${outPath} already exists.\n` +
          `  Use --preserve-meta to keep existing chapters/title/etc and only replace turns,\n` +
          `  or --overwrite to fully replace the file.\n`,
      );
      process.exit(1);
    }

    const id = path.basename(outPath, '.json');
    const subtitle = cleanSubtitle(meta.description, meta.title);

    const skeleton: EpisodeSkeleton = {
      id,
      videoId,
      title: meta.title || 'TBD',
      subtitle,
      speakerName: finalSpeaker,
      speakerAvatar: `/avatars/${id}.jpg`,
      startTime: args.startTime,
      duration: Math.ceil((turns[turns.length - 1]?.start ?? 0) + 30),
      turns,
    };

    if (meta.channelId) {
      try {
        const avatarUrl = await getChannelAvatar(meta.channelId, dispatcher, ctrl.signal);
        if (avatarUrl) {
          const avatarAbs = path.resolve(process.cwd(), 'public', 'avatars', `${id}.jpg`);
          await downloadImage(avatarUrl, avatarAbs, dispatcher, ctrl.signal);
          process.stdout.write(`[fetch-transcript] avatar saved: ${avatarAbs}\n`);
        } else {
          process.stdout.write(`[fetch-transcript] warn: no avatar found for channel ${meta.channelId}\n`);
        }
      } catch (e) {
        process.stdout.write(`[fetch-transcript] warn: avatar download failed: ${(e as Error).message}\n`);
      }
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(skeleton, null, 2) + '\n', 'utf-8');
    process.stdout.write(`[fetch-transcript] wrote ${outPath} (auto-filled)\n`);
  } finally {
    clearTimeout(timer);
  }
}

main().catch(reportError);
