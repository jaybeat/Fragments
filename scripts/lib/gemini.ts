import { fetch as undiciFetch, type Dispatcher } from 'undici';
import type { Turn } from './merge-turns.ts';

export interface Chapter {
  start: number;
  end: number;
  title: string;
  description: string;
}

export interface GeminiChapter {
  title: string;
  description: string;
  startTurnIndex: number;
  endTurnIndex: number;
}

export interface GeminiResult {
  subtitle: string;
  chapters: GeminiChapter[];
}

export interface EpisodeForChapters {
  id: string;
  title: string;
  speakerName: string;
  duration: number;
  turns: Turn[];
}

export class GeminiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiError';
  }
}

export class GeminiHttpError extends GeminiError {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`Gemini HTTP ${status}: ${body.slice(0, 500)}`);
  }
}

export class GeminiBlockedError extends GeminiError {
  constructor(public reason: string) {
    super(`Gemini blocked the request: ${reason}`);
  }
}

export class GeminiSchemaError extends GeminiError {}
export class GeminiValidationError extends GeminiError {
  constructor(public reasons: string[]) {
    super(`Gemini result failed validation:\n  - ${reasons.join('\n  - ')}`);
  }
}

const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

function mmss(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export interface BuildPromptOptions {
  targetChapters: string;
}

export function buildPrompt(episode: EpisodeForChapters, opts: BuildPromptOptions): string {
  const lines: string[] = [];
  lines.push('你是中文播客内容编辑助手。下面是一段视频/演讲的转录文本，已被切成带时间戳的若干 turn。');
  lines.push('请只输出 JSON（schema 已约束），完成两件事：');
  lines.push('');
  lines.push('1. subtitle: 一句精炼的中文副标题，15 字以内，概括整体核心议题。避免"概述/介绍"等空话。');
  lines.push(`2. chapters: 把全文按主题切成 ${opts.targetChapters} 段，每段：`);
  lines.push('   - title: 中文关键词短语，10 字以内（如"配口疮与雷阻"、"上位者与男性"）。');
  lines.push('     动名词/对比/冲突优先；不要前缀"PART1:"，调用方会自加。');
  lines.push('   - description: 1-2 句中文简介，说明这一段在讲什么。');
  lines.push('   - startTurnIndex / endTurnIndex: 该段覆盖的起止 turn 行号（含两端，0 起算）。');
  lines.push('');
  lines.push('约束（违反会被拒绝）：');
  lines.push('- chapters 必须按时间顺序，覆盖 turn 0 到最后一个 turn 的全部内容，不重叠不留空。');
  lines.push('- 第一段 startTurnIndex = 0；最后一段 endTurnIndex = 最后一个 turn 的索引。');
  lines.push('- 即使原文是英文，title 与 description 一律使用中文。');
  lines.push('- subtitle / title / description 全部非空。');
  lines.push('');
  lines.push('视频信息：');
  lines.push(`  标题: ${episode.title}`);
  lines.push(`  讲者: ${episode.speakerName}`);
  lines.push('');
  lines.push(`转录（共 ${episode.turns.length} 个 turn，行号从 0 开始）：`);
  for (let i = 0; i < episode.turns.length; i++) {
    const t = episode.turns[i];
    lines.push(`[${i}\t${mmss(t.start)}] (${t.who}) ${t.text}`);
  }
  return lines.join('\n');
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    subtitle: { type: 'string' },
    chapters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          startTurnIndex: { type: 'integer' },
          endTurnIndex: { type: 'integer' },
        },
        required: ['title', 'description', 'startTurnIndex', 'endTurnIndex'],
        propertyOrdering: ['title', 'description', 'startTurnIndex', 'endTurnIndex'],
      },
    },
  },
  required: ['subtitle', 'chapters'],
  propertyOrdering: ['subtitle', 'chapters'],
};

export interface CallGeminiOptions {
  apiKey: string;
  model: string;
  dispatcher?: Dispatcher;
  signal?: AbortSignal;
}

export async function callGemini(prompt: string, opts: CallGeminiOptions): Promise<GeminiResult> {
  const url = `${ENDPOINT(opts.model)}?key=${encodeURIComponent(opts.apiKey)}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.4,
    },
  };

  const res = await undiciFetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    dispatcher: opts.dispatcher,
    signal: opts.signal,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new GeminiHttpError(res.status, text);
  }

  let data: {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
  };
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new GeminiSchemaError(`Top-level JSON parse failed: ${(e as Error).message}\n${text.slice(0, 500)}`);
  }

  if (data.promptFeedback?.blockReason) {
    throw new GeminiBlockedError(data.promptFeedback.blockReason);
  }

  const partText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!partText) {
    throw new GeminiSchemaError(`No text in candidates[0].content.parts[0]: ${text.slice(0, 500)}`);
  }

  let result: GeminiResult;
  try {
    result = JSON.parse(partText) as GeminiResult;
  } catch (e) {
    throw new GeminiSchemaError(
      `Inner JSON parse failed: ${(e as Error).message}\n${partText.slice(0, 500)}`
    );
  }

  if (typeof result.subtitle !== 'string' || !Array.isArray(result.chapters)) {
    throw new GeminiSchemaError(`Result missing subtitle/chapters: ${JSON.stringify(result).slice(0, 500)}`);
  }

  return result;
}

export function validateGeminiResult(turns: Turn[], result: GeminiResult): string[] {
  const errors: string[] = [];
  if (!result.subtitle.trim()) errors.push('subtitle is empty');
  if (result.subtitle.length > 30) errors.push(`subtitle too long (${result.subtitle.length} > 30)`);

  const n = result.chapters.length;
  if (n < 1 || n > 10) errors.push(`chapters length out of range [1, 10]: ${n}`);

  const T = turns.length;
  for (let i = 0; i < n; i++) {
    const c = result.chapters[i];
    if (!c.title?.trim()) errors.push(`chapters[${i}].title is empty`);
    if (!c.description?.trim()) errors.push(`chapters[${i}].description is empty`);
    if (!Number.isInteger(c.startTurnIndex) || c.startTurnIndex < 0 || c.startTurnIndex >= T)
      errors.push(`chapters[${i}].startTurnIndex out of range: ${c.startTurnIndex}`);
    if (!Number.isInteger(c.endTurnIndex) || c.endTurnIndex < 0 || c.endTurnIndex >= T)
      errors.push(`chapters[${i}].endTurnIndex out of range: ${c.endTurnIndex}`);
    if (c.startTurnIndex > c.endTurnIndex)
      errors.push(`chapters[${i}] startTurnIndex > endTurnIndex: ${c.startTurnIndex} > ${c.endTurnIndex}`);
  }

  if (n > 0) {
    if (result.chapters[0].startTurnIndex !== 0)
      errors.push(`first chapter must start at turn 0, got ${result.chapters[0].startTurnIndex}`);
    if (result.chapters[n - 1].endTurnIndex !== T - 1)
      errors.push(
        `last chapter must end at turn ${T - 1}, got ${result.chapters[n - 1].endTurnIndex}`
      );
    for (let i = 1; i < n; i++) {
      const prev = result.chapters[i - 1];
      const cur = result.chapters[i];
      if (cur.startTurnIndex !== prev.endTurnIndex + 1)
        errors.push(
          `chapter ${i} must start at turn ${prev.endTurnIndex + 1}, got ${cur.startTurnIndex}`
        );
    }
  }

  return errors;
}

export function indicesToTimes(
  turns: Turn[],
  episodeDuration: number,
  c: GeminiChapter
): Chapter {
  const start = turns[c.startTurnIndex].start;
  const end =
    c.endTurnIndex + 1 < turns.length ? turns[c.endTurnIndex + 1].start : episodeDuration;
  return { start, end, title: c.title, description: c.description };
}
