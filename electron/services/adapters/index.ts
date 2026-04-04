import type { PlatformAdapter } from './types';
import { CodeforcesAdapter } from './codeforces.adapter';
import { LeetCodeAdapter } from './leetcode.adapter';
import { LanqiaoAdapter } from './lanqiao.adapter';
import { LuoguAdapter } from './luogu.adapter';
import { AtCoderAdapter } from './atcoder.adapter';
import { NowcoderAdapter } from './nowcoder.adapter';
import { VJudgeAdapter } from './vjudge.adapter';
import { HduAdapter } from './hdu.adapter';
import { PojAdapter } from './poj.adapter';
import { QojAdapter } from './qoj.adapter';

/** Singleton instances of all platform adapters */
const adapters: PlatformAdapter[] = [
  new CodeforcesAdapter(),
  new LeetCodeAdapter(),
  new LanqiaoAdapter(),
  new LuoguAdapter(),
  new AtCoderAdapter(),
  new NowcoderAdapter(),
  new VJudgeAdapter(),
  new HduAdapter(),
  new PojAdapter(),
  new QojAdapter(),
];

/** Map for O(1) lookup by adapter id */
const adapterMap = new Map<string, PlatformAdapter>(
  adapters.map((a) => [a.id, a]),
);

/** Get all registered adapters */
export function getAllAdapters(): PlatformAdapter[] {
  return adapters;
}

/** Get a specific adapter by platform id */
export function getAdapter(id: string): PlatformAdapter | undefined {
  return adapterMap.get(id);
}

/** Get adapters that support contest fetching */
export function getContestAdapters(): PlatformAdapter[] {
  return adapters.filter((a) => typeof a.fetchContests === 'function');
}

/** Get adapters that support rating queries */
export function getRatingAdapters(): PlatformAdapter[] {
  return adapters.filter((a) => typeof a.fetchRating === 'function');
}

/** Get adapters that support solved count queries */
export function getSolvedAdapters(): PlatformAdapter[] {
  return adapters.filter((a) => typeof a.fetchSolvedCount === 'function');
}

export {
  CodeforcesAdapter,
  LeetCodeAdapter,
  LanqiaoAdapter,
  LuoguAdapter,
  AtCoderAdapter,
  NowcoderAdapter,
  VJudgeAdapter,
  HduAdapter,
  PojAdapter,
  QojAdapter,
};

export type { PlatformAdapter, FetchResult, AggregateResult } from './types';
