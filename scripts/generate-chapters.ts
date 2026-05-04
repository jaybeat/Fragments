import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { ProxyAgent, type Dispatcher } from 'undici';
import {
  buildPrompt,
  callGemini,
  validateGeminiResult,
  indicesToTimes,
  GeminiError,
  GeminiHttpError,
  GeminiBlockedError,
  GeminiSchemaError,
  GeminiValidationError,
  type Chapter,
  type EpisodeForChapters,
  type GeminiResult,
} from './lib/gemini.ts';
import type { Turn } from './lib/merge-turns.ts';

interface Args {
  episodePath: string;
  model: string;
  targetChapters: string;
  dryRun: boolean;
  noCache: boolean;
}

interface CacheFile {
  hash: string;
  model: string;
  timestamp: string;
  raw: GeminiResult;
}

interface EpisodeJson {
  id: string;
  videoId: string;
  title: string;
  subtitle: string;
  speakerName: string;
  speakerAvatar: string;
  startTime?: number;
  duration: number;
  turns: Turn[];
  chapters?: Chapter[];
  [key: string]: unknown;
}

const HELP = `Usage:
  npm run generate-chapters -- <episodePath> [options]

Required:
  <episodePath>            Path to src/data/episodes/<id>.json

Options:
  --model <id>             Gemini model                                          [default: gemini-2.5-flash]
  --target-chapters <str>  Number / range hint for the LLM (e.g. "4-7" or "5")   [default: 4-7]
  --no-cache               Skip scripts/cache/<id>-chapters.json lookup
  --dry-run                Print result and do NOT write episode JSON
  -h, --help               Show this help

Environment:
  GEMINI_API_KEY           Required. Loaded via tsx --env-file=.env (see .env.example).
  HTTPS_PROXY / HTTP_PROXY Optional proxy for the API call.

Examples:
  npm run generate-chapters -- src/data/episodes/jobs-stanford.json --dry-run
  npm run generate-chapters -- src/data/episodes/jobs-stanford.json
  npm run generate-chapters -- src/data/episodes/jobs-stanford.json --no-cache --target-chapters 5
`;

function parseArgs(argv: string[]): Args {
  let episodePath: string | undefined;
  let model = 'gemini-2.5-flash';
  let targetChapters = '4-7';
  let dryRun = false;
  let noCache = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-h':
      case '--help':
        process.stdout.write(HELP);
        process.exit(0);
      case '--model':
        model = argv[++i];
        break;
      case '--target-chapters':
        targetChapters = argv[++i];
        break;
      case '--dry-run':
        dryRun = true;
        break;
      case '--no-cache':
        noCache = true;
        break;
      default:
        if (a.startsWith('--')) {
          throw new Error(`Unknown flag: ${a}`);
        }
        if (episodePath) throw new Error(`Unexpected positional arg: ${a}`);
        episodePath = a;
    }
  }
  if (!episodePath) {
    process.stderr.write(HELP);
    throw new Error('episodePath is required');
  }
  return { episodePath, model, targetChapters, dryRun, noCache };
}

const CACHE_DIR = path.resolve(process.cwd(), 'scripts', 'cache');

function cachePath(episodeId: string): string {
  return path.join(CACHE_DIR, `${episodeId}-chapters.json`);
}

function loadCache(episodeId: string): CacheFile | undefined {
  const p = cachePath(episodeId);
  if (!fs.existsSync(p)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as CacheFile;
  } catch {
    return undefined;
  }
}

function saveCache(episodeId: string, file: CacheFile): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePath(episodeId), JSON.stringify(file, null, 2) + '\n', 'utf-8');
}

function computeHash(input: {
  turns: Turn[];
  title: string;
  speakerName: string;
  model: string;
  targetChapters: string;
}): string {
  const normalized = {
    turns: input.turns.map((t) => ({ start: t.start, who: t.who, text: t.text })),
    title: input.title,
    speakerName: input.speakerName,
    model: input.model,
    targetChapters: input.targetChapters,
  };
  return (
    'sha256:' +
    crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
  );
}

function loadEpisode(episodePath: string): EpisodeJson {
  if (!fs.existsSync(episodePath)) {
    throw new Error(`Episode JSON not found: ${episodePath}`);
  }
  const raw = fs.readFileSync(episodePath, 'utf-8');
  let parsed: EpisodeJson;
  try {
    parsed = JSON.parse(raw) as EpisodeJson;
  } catch (e) {
    throw new Error(`Episode JSON parse failed: ${(e as Error).message}`);
  }
  if (!parsed.id || !Array.isArray(parsed.turns) || parsed.turns.length === 0) {
    throw new Error(`Episode JSON missing id or turns: ${episodePath}`);
  }
  return parsed;
}

function summarize(result: GeminiResult, chapters: Chapter[]): string {
  const lines: string[] = [];
  lines.push(`  subtitle: ${result.subtitle}`);
  lines.push(`  chapters (${chapters.length}):`);
  for (let i = 0; i < chapters.length; i++) {
    const c = chapters[i];
    const span = `${formatMmss(c.start)}-${formatMmss(c.end)}`;
    lines.push(`    [${i + 1}] ${span}  ${c.title}  —  ${c.description}`);
  }
  return lines.join('\n');
}

function formatMmss(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function reportError(err: unknown): never {
  if (err instanceof GeminiHttpError) {
    process.stderr.write(`[generate-chapters] Gemini HTTP ${err.status}\n${err.body}\n`);
  } else if (err instanceof GeminiBlockedError) {
    process.stderr.write(`[generate-chapters] Gemini blocked: ${err.reason}\n`);
  } else if (err instanceof GeminiValidationError) {
    process.stderr.write(
      `[generate-chapters] Validation failed:\n  - ${err.reasons.join('\n  - ')}\n`
    );
  } else if (err instanceof GeminiSchemaError) {
    process.stderr.write(`[generate-chapters] Gemini schema error: ${err.message}\n`);
  } else if (err instanceof GeminiError) {
    process.stderr.write(`[generate-chapters] ${err.message}\n`);
  } else if (err instanceof Error) {
    process.stderr.write(`[generate-chapters] ${err.stack ?? err.message}\n`);
  } else {
    process.stderr.write(`[generate-chapters] Unknown error: ${String(err)}\n`);
  }
  process.exit(1);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      `GEMINI_API_KEY is not set.\n` +
        `  Run: cp .env.example .env  and fill in your key.\n` +
        `  npm run generate-chapters loads it via tsx --env-file=.env automatically.`
    );
  }

  const episodePath = path.resolve(args.episodePath);
  const episode = loadEpisode(episodePath);

  const episodeForPrompt: EpisodeForChapters = {
    id: episode.id,
    title: episode.title,
    speakerName: episode.speakerName,
    duration: episode.duration,
    turns: episode.turns,
  };

  const hash = computeHash({
    turns: episode.turns,
    title: episode.title,
    speakerName: episode.speakerName,
    model: args.model,
    targetChapters: args.targetChapters,
  });

  process.stdout.write(
    `[generate-chapters] episode=${episode.id} turns=${episode.turns.length} model=${args.model}\n`
  );

  let raw: GeminiResult | undefined;
  if (!args.noCache) {
    const cached = loadCache(episode.id);
    if (cached && cached.hash === hash) {
      raw = cached.raw;
      process.stdout.write(
        `[generate-chapters] using cached result (${cachePath(episode.id)})\n`
      );
    }
  }

  if (!raw) {
    const proxy =
      process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY ||
      process.env.https_proxy ||
      process.env.http_proxy;
    let dispatcher: Dispatcher | undefined;
    if (proxy) {
      process.stdout.write(`[generate-chapters] using proxy: ${proxy}\n`);
      dispatcher = new ProxyAgent(proxy);
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60_000);

    try {
      const prompt = buildPrompt(episodeForPrompt, { targetChapters: args.targetChapters });
      process.stdout.write(`[generate-chapters] calling Gemini (prompt ${prompt.length} chars)...\n`);
      raw = await callGemini(prompt, {
        apiKey,
        model: args.model,
        dispatcher,
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!args.dryRun) {
      saveCache(episode.id, {
        hash,
        model: args.model,
        timestamp: new Date().toISOString(),
        raw,
      });
      process.stdout.write(`[generate-chapters] cached to ${cachePath(episode.id)}\n`);
    }
  }

  const validationErrors = validateGeminiResult(episode.turns, raw);
  if (validationErrors.length > 0) {
    process.stderr.write(
      `[generate-chapters] raw response:\n${JSON.stringify(raw, null, 2)}\n`
    );
    throw new GeminiValidationError(validationErrors);
  }

  const chapters: Chapter[] = raw.chapters.map((c) =>
    indicesToTimes(episode.turns, episode.duration, c)
  );

  process.stdout.write(summarize(raw, chapters) + '\n');

  if (args.dryRun) {
    process.stdout.write(`[generate-chapters] --dry-run: not writing ${episodePath}\n`);
    return;
  }

  episode.subtitle = raw.subtitle;
  episode.chapters = chapters;
  fs.writeFileSync(episodePath, JSON.stringify(episode, null, 2) + '\n', 'utf-8');
  process.stdout.write(`[generate-chapters] wrote ${episodePath}\n`);
}

main().catch(reportError);
