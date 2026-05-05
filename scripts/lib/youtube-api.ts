import * as fs from 'node:fs';
import * as path from 'node:path';
import { fetch as undiciFetch, type Dispatcher } from 'undici';

export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string; // 'asr' for auto-generated, undefined for manual
  trackName?: string;
  displayName?: string;
}

export interface RawSegment {
  offset: number; // seconds
  duration: number; // seconds
  text: string;
}

export class CaptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CaptionError';
  }
}

export class VideoUnavailableError extends CaptionError {}
export class CaptionsDisabledError extends CaptionError {}
export class NoCaptionTracksError extends CaptionError {}
export class LanguageNotAvailableError extends CaptionError {
  constructor(
    public lang: string,
    public available: string[]
  ) {
    super(`Caption language "${lang}" is not available. Available: ${available.join(', ')}`);
  }
}

const INNERTUBE_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
const ANDROID_USER_AGENT = 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)';

const ENTITY_REPLACEMENTS: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&(amp|lt|gt|quot|apos|#39);/g, (m) => ENTITY_REPLACEMENTS[m] ?? m)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)));
}

interface InnerTubePlayerResponse {
  playabilityStatus?: { status?: string; reason?: string };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: Array<{
        baseUrl: string;
        languageCode: string;
        kind?: string;
        trackName?: string;
        name?: { runs?: Array<{ text?: string }>; simpleText?: string };
      }>;
      translationLanguages?: Array<{
        languageCode: string;
        languageName?: { simpleText?: string };
      }>;
    };
  };
  videoDetails?: {
    videoId?: string;
    title?: string;
    lengthSeconds?: string;
    author?: string;
    channelId?: string;
    thumbnail?: { thumbnails?: Array<{ url: string; width: number; height: number }> };
  };
  microformat?: {
    playerMicroformatRenderer?: {
      ownerChannelName?: string;
      publishDate?: string;
      externalChannelId?: string;
    };
  };
}

export interface VideoMeta {
  title: string;
  author: string;
  channelId: string;
  publishDate?: string;
  lengthSeconds: number;
  thumbnail: string;
}

async function fetchPlayer(
  videoId: string,
  dispatcher: Dispatcher | undefined,
  signal: AbortSignal
): Promise<InnerTubePlayerResponse> {
  const body = {
    context: {
      client: { clientName: 'ANDROID', clientVersion: '20.10.38', hl: 'en', gl: 'US' },
    },
    videoId,
    contentCheckOk: true,
    racyCheckOk: true,
  };

  const res = await undiciFetch(INNERTUBE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': ANDROID_USER_AGENT },
    body: JSON.stringify(body),
    dispatcher,
    signal,
  });
  if (!res.ok) {
    throw new CaptionError(`InnerTube request failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as InnerTubePlayerResponse;

  const status = json.playabilityStatus?.status;
  if (status && status !== 'OK') {
    throw new VideoUnavailableError(
      `Video unavailable (${status}): ${json.playabilityStatus?.reason ?? 'unknown'}`
    );
  }
  return json;
}

function extractTracks(json: InnerTubePlayerResponse, videoId: string): CaptionTrack[] {
  const renderer = json.captions?.playerCaptionsTracklistRenderer;
  if (!renderer)
    throw new CaptionsDisabledError(`Captions are disabled or unavailable for ${videoId}`);

  const tracks = renderer.captionTracks ?? [];
  if (tracks.length === 0) throw new NoCaptionTracksError(`No caption tracks for ${videoId}`);

  return tracks.map((t) => ({
    baseUrl: t.baseUrl,
    languageCode: t.languageCode,
    kind: t.kind,
    trackName: t.trackName || undefined,
    displayName: t.name?.runs?.map((r) => r.text ?? '').join('') || t.name?.simpleText,
  }));
}

function extractMeta(json: InnerTubePlayerResponse): VideoMeta {
  const vd = json.videoDetails ?? {};
  const mf = json.microformat?.playerMicroformatRenderer ?? {};
  return {
    title: vd.title ?? '',
    author: vd.author ?? mf.ownerChannelName ?? '',
    channelId: vd.channelId ?? mf.externalChannelId ?? '',
    publishDate: mf.publishDate,
    lengthSeconds: parseInt(vd.lengthSeconds ?? '', 10) || 0,
    thumbnail: pickLargestThumbnail(vd.thumbnail?.thumbnails) ?? '',
  };
}

export async function getCaptionTracks(
  videoId: string,
  dispatcher: Dispatcher | undefined,
  signal: AbortSignal
): Promise<CaptionTrack[]> {
  const json = await fetchPlayer(videoId, dispatcher, signal);
  return extractTracks(json, videoId);
}

export async function getPlayerData(
  videoId: string,
  dispatcher: Dispatcher | undefined,
  signal: AbortSignal
): Promise<{ tracks: CaptionTrack[]; meta: VideoMeta }> {
  const json = await fetchPlayer(videoId, dispatcher, signal);
  const tracks = extractTracks(json, videoId);
  const meta = extractMeta(json);
  return { tracks, meta };
}

export function pickTrack(tracks: CaptionTrack[], lang: string, preferManual = true): CaptionTrack {
  const matching = tracks.filter((t) => t.languageCode === lang);
  if (matching.length === 0) {
    throw new LanguageNotAvailableError(
      lang,
      tracks.map((t) => t.languageCode)
    );
  }
  if (preferManual) {
    const manual = matching.find((t) => !t.kind);
    if (manual) return manual;
    return matching[0];
  }
  const auto = matching.find((t) => t.kind === 'asr');
  if (auto) return auto;
  return matching[0];
}

export async function fetchTrackXml(
  baseUrl: string,
  dispatcher: Dispatcher | undefined,
  signal: AbortSignal,
  translationLang?: string
): Promise<string> {
  let url = baseUrl.includes('fmt=') ? baseUrl : `${baseUrl}&fmt=srv3`;
  if (translationLang) {
    url += `&tlang=${encodeURIComponent(translationLang)}`;
  }
  const res = await undiciFetch(url, { dispatcher, signal });
  if (!res.ok) throw new CaptionError(`Caption fetch failed: ${res.status} ${res.statusText}`);
  return await res.text();
}

export function parseSrv3(xml: string): RawSegment[] {
  const segments: RawSegment[] = [];
  const pRegex = /<p\b([^>]*)>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = pRegex.exec(xml)) !== null) {
    const attrs = m[1];
    const inner = m[2];
    const tMatch = attrs.match(/\bt="(\d+)"/);
    const dMatch = attrs.match(/\bd="(\d+)"/);
    if (!tMatch) continue;
    const t = parseInt(tMatch[1], 10);
    const d = dMatch ? parseInt(dMatch[1], 10) : 0;
    const text = inner
      .replace(/<s\b[^>]*>/g, '')
      .replace(/<\/s>/g, '')
      .replace(/<br\s*\/?>/g, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    segments.push({ offset: t / 1000, duration: d / 1000, text: decodeEntities(text) });
  }
  return segments;
}

export function parseClassic(xml: string): RawSegment[] {
  const segments: RawSegment[] = [];
  const textRegex = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  while ((m = textRegex.exec(xml)) !== null) {
    const attrs = m[1];
    const inner = m[2];
    const startMatch = attrs.match(/\bstart="([\d.]+)"/);
    const durMatch = attrs.match(/\bdur="([\d.]+)"/);
    if (!startMatch) continue;
    const start = parseFloat(startMatch[1]);
    const duration = durMatch ? parseFloat(durMatch[1]) : 0;
    const text = inner
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    segments.push({ offset: start, duration, text: decodeEntities(text) });
  }
  return segments;
}

export function parseTrackXml(xml: string): RawSegment[] {
  if (/<timedtext\b/.test(xml) && /<p\b/.test(xml)) return parseSrv3(xml);
  if (/<text\b/.test(xml)) return parseClassic(xml);
  throw new CaptionError('Unrecognized caption XML format (neither srv3 nor classic)');
}

interface ThumbnailItem {
  url: string;
  width?: number;
  height?: number;
}

function pickLargestThumbnail(items: ThumbnailItem[] | undefined): string | undefined {
  if (!items || items.length === 0) return undefined;
  return items.reduce((best, cur) => ((cur.width ?? 0) > (best.width ?? 0) ? cur : best)).url;
}

export async function downloadImage(
  url: string,
  destPath: string,
  dispatcher: Dispatcher | undefined,
  signal: AbortSignal
): Promise<void> {
  const res = await undiciFetch(url, { dispatcher, signal });
  if (!res.ok) throw new CaptionError(`Image download failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
}
