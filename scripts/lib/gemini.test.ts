import { describe, it, expect } from 'vitest';
import {
  buildPrompt,
  validateGeminiResult,
  indicesToTimes,
  type EpisodeForChapters,
} from './gemini';
import type { Turn } from './merge-turns';

function makeTurns(items: { start: number; who: string; text: string }[]): Turn[] {
  return items.map((t) => ({ ...t }));
}

function makeEpisode(overrides?: Partial<EpisodeForChapters>): EpisodeForChapters {
  return {
    id: 'test',
    title: 'Test Episode',
    speakerName: 'Tester',
    duration: 120,
    turns: makeTurns([
      { start: 0, who: 'Tester', text: 'Hello world.' },
      { start: 10, who: 'Tester', text: 'How are you?' },
      { start: 20, who: 'Tester', text: 'I am fine.' },
    ]),
    ...overrides,
  };
}

describe('buildPrompt', () => {
  it('includes title and speakerName', () => {
    const ep = makeEpisode({ title: 'Foo Bar', speakerName: 'Alice' });
    const prompt = buildPrompt(ep, { targetChapters: '4-7' });
    expect(prompt).toContain('Foo Bar');
    expect(prompt).toContain('Alice');
    expect(prompt).toContain('4-7');
  });

  it('includes all turn texts', () => {
    const ep = makeEpisode();
    const prompt = buildPrompt(ep, { targetChapters: '4-7' });
    expect(prompt).toContain('Hello world.');
    expect(prompt).toContain('How are you?');
    expect(prompt).toContain('I am fine.');
  });

  it('formats timestamps as mm:ss', () => {
    const ep = makeEpisode({
      turns: makeTurns([{ start: 65, who: 'A', text: 'One minute five.' }]),
    });
    const prompt = buildPrompt(ep, { targetChapters: '4-7' });
    expect(prompt).toContain('1:05');
  });

  it('enumerates turns with index', () => {
    const ep = makeEpisode();
    const prompt = buildPrompt(ep, { targetChapters: '4-7' });
    expect(prompt).toContain('[0\t0:00]');
    expect(prompt).toContain('[1\t0:10]');
    expect(prompt).toContain('[2\t0:20]');
  });

  it('includes constraints', () => {
    const ep = makeEpisode();
    const prompt = buildPrompt(ep, { targetChapters: '4-7' });
    expect(prompt).toContain('不重叠不留空');
    expect(prompt).toContain('startTurnIndex = 0');
  });
});

describe('validateGeminiResult', () => {
  const turns = makeTurns([
    { start: 0, who: 'A', text: 'A' },
    { start: 10, who: 'A', text: 'B' },
    { start: 20, who: 'A', text: 'C' },
    { start: 30, who: 'A', text: 'D' },
  ]);

  it('passes valid result', () => {
    const errors = validateGeminiResult(turns, {
      subtitle: '测试副标题',
      chapters: [
        { title: '开头', description: '介绍', startTurnIndex: 0, endTurnIndex: 1 },
        { title: '结尾', description: '总结', startTurnIndex: 2, endTurnIndex: 3 },
      ],
    });
    expect(errors).toHaveLength(0);
  });

  it('fails empty subtitle', () => {
    const errors = validateGeminiResult(turns, {
      subtitle: '   ',
      chapters: [
        { title: '开头', description: '介绍', startTurnIndex: 0, endTurnIndex: 1 },
        { title: '结尾', description: '总结', startTurnIndex: 2, endTurnIndex: 3 },
      ],
    });
    expect(errors).toContain('subtitle is empty');
  });

  it('fails too-long subtitle', () => {
    const errors = validateGeminiResult(turns, {
      subtitle: 'a'.repeat(31),
      chapters: [
        { title: '开头', description: '介绍', startTurnIndex: 0, endTurnIndex: 1 },
        { title: '结尾', description: '总结', startTurnIndex: 2, endTurnIndex: 3 },
      ],
    });
    expect(errors).toContain('subtitle too long (31 > 30)');
  });

  it('fails when first chapter does not start at 0', () => {
    const errors = validateGeminiResult(turns, {
      subtitle: '副标题',
      chapters: [
        { title: '中间', description: '中间段', startTurnIndex: 1, endTurnIndex: 3 },
      ],
    });
    expect(errors).toContain('first chapter must start at turn 0, got 1');
  });

  it('fails when last chapter does not end at last turn', () => {
    const errors = validateGeminiResult(turns, {
      subtitle: '副标题',
      chapters: [
        { title: '开头', description: '介绍', startTurnIndex: 0, endTurnIndex: 2 },
      ],
    });
    expect(errors).toContain('last chapter must end at turn 3, got 2');
  });

  it('fails when chapters overlap', () => {
    const errors = validateGeminiResult(turns, {
      subtitle: '副标题',
      chapters: [
        { title: '开头', description: '介绍', startTurnIndex: 0, endTurnIndex: 1 },
        { title: '中间', description: '中间段', startTurnIndex: 1, endTurnIndex: 2 },
        { title: '结尾', description: '总结', startTurnIndex: 3, endTurnIndex: 3 },
      ],
    });
    expect(errors).toContain('chapter 1 must start at turn 2, got 1');
  });

  it('fails when chapter count is zero', () => {
    const errors = validateGeminiResult(turns, {
      subtitle: '副标题',
      chapters: [],
    });
    expect(errors).toContain('chapters length out of range [1, 10]: 0');
  });

  it('fails when turn index out of range', () => {
    const errors = validateGeminiResult(turns, {
      subtitle: '副标题',
      chapters: [
        { title: '开头', description: '介绍', startTurnIndex: -1, endTurnIndex: 3 },
      ],
    });
    expect(errors).toContain('chapters[0].startTurnIndex out of range: -1');
  });

  it('fails when startTurnIndex > endTurnIndex', () => {
    const errors = validateGeminiResult(turns, {
      subtitle: '副标题',
      chapters: [
        { title: '开头', description: '介绍', startTurnIndex: 2, endTurnIndex: 1 },
      ],
    });
    expect(errors).toContain('chapters[0] startTurnIndex > endTurnIndex: 2 > 1');
  });

  it('fails when title/description empty', () => {
    const errors = validateGeminiResult(turns, {
      subtitle: '副标题',
      chapters: [
        { title: '', description: 'ok', startTurnIndex: 0, endTurnIndex: 3 },
      ],
    });
    expect(errors).toContain('chapters[0].title is empty');
  });
});

describe('indicesToTimes', () => {
  const turns = makeTurns([
    { start: 0, who: 'A', text: 'A' },
    { start: 10, who: 'A', text: 'B' },
    { start: 20, who: 'A', text: 'C' },
    { start: 30, who: 'A', text: 'D' },
  ]);

  it('maps first chapter from start 0', () => {
    const c = indicesToTimes(turns, 45, {
      title: '开头',
      description: '介绍',
      startTurnIndex: 0,
      endTurnIndex: 1,
    });
    expect(c.start).toBe(0);
    expect(c.end).toBe(20); // next turn after endTurnIndex is turns[2]
  });

  it('maps middle chapter', () => {
    const c = indicesToTimes(turns, 45, {
      title: '中段',
      description: '中段描述',
      startTurnIndex: 1,
      endTurnIndex: 2,
    });
    expect(c.start).toBe(10);
    expect(c.end).toBe(30);
  });

  it('maps last chapter to episode duration', () => {
    const c = indicesToTimes(turns, 45, {
      title: '结尾',
      description: '总结',
      startTurnIndex: 3,
      endTurnIndex: 3,
    });
    expect(c.start).toBe(30);
    expect(c.end).toBe(45); // no turn after 3, fall back to duration
  });
});
