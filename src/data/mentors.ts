import type { Episode, Mentor, PSegment } from '../types';
import { EPISODES } from './episodes';

export const MENTORS: Mentor[] = [
  {
    id: 'jobs',
    name: 'Steve Jobs',
    nameCn: '史蒂夫·乔布斯',
    avatar: '/avatars/jobs.svg',
    bio: '苹果联合创始人，以极致的产品哲学和对创新的执着闻名。他的演讲与访谈不仅是科技史的经典，更是关于热爱、失败与死亡的深刻思考。',
    episodeIds: ['jobs-stanford', 'jobs-lost-interview', 'jobs-interview-1990'],
  },
  {
    id: 'buffett',
    name: 'Warren Buffett',
    nameCn: '沃伦·巴菲特',
    avatar: '/avatars/buffett-florida-1998.jpg',
    bio: '伯克希尔·哈撒韦董事长，被誉为"奥马哈的先知"。他的投资智慧与人生哲学，跨越周期，历久弥新。',
    episodeIds: ['buffett-florida-1998'],
  },
  {
    id: 'feynman',
    name: 'Richard Feynman',
    nameCn: '理查德·费曼',
    avatar: '/avatars/feynman-fun-to-imagine.jpg',
    bio: '诺贝尔物理学奖得主，以费曼图和量子电动力学闻名。他用最生动的语言，把科学的本质讲给普通人听。',
    episodeIds: ['feynman-fun-to-imagine'],
  },
];

export function getMentorById(id: string): Mentor | undefined {
  return MENTORS.find((m) => m.id === id);
}

export function getEpisodesByMentor(mentorId: string): Episode[] {
  const mentor = getMentorById(mentorId);
  if (!mentor) return [];
  return EPISODES.filter((e) => mentor.episodeIds.includes(e.id));
}

export function getMentorForEpisode(episodeId: string): Mentor | undefined {
  return MENTORS.find((m) => m.episodeIds.includes(episodeId));
}

export interface SegmentWithEpisode {
  episode: Episode;
  p: PSegment;
}

export function getAllPSegmentsByMentor(mentorId: string): SegmentWithEpisode[] {
  const episodes = getEpisodesByMentor(mentorId);
  const result: SegmentWithEpisode[] = [];
  for (const ep of episodes) {
    for (const p of ep.p_segments ?? []) {
      result.push({ episode: ep, p });
    }
  }
  return result;
}

export function groupPSegmentsByDomain(
  mentorId: string
): Map<string, SegmentWithEpisode[]> {
  const all = getAllPSegmentsByMentor(mentorId);
  const map = new Map<string, SegmentWithEpisode[]>();
  for (const item of all) {
    for (const domain of item.p.domain) {
      const arr = map.get(domain) ?? [];
      arr.push(item);
      map.set(domain, arr);
    }
  }
  return new Map([...map.entries()].sort((a, b) => b[1].length - a[1].length));
}
