import type { RawContest, Rating, SolvedNum } from '../../shared/types';

/** Validate that an object is a well-formed RawContest */
export function validateContest(c: unknown): c is RawContest {
  if (!c || typeof c !== 'object') return false;
  const obj = c as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    obj.name.length > 0 &&
    typeof obj.startTime === 'number' &&
    Number.isFinite(obj.startTime) &&
    obj.startTime > 1_000_000_000 && // after 2001
    typeof obj.duration === 'number' &&
    obj.duration > 0 &&
    typeof obj.platform === 'string' &&
    obj.platform.length > 0
  );
}

/** Validate that an object is a well-formed Rating */
export function validateRating(r: unknown): r is Rating {
  if (!r || typeof r !== 'object') return false;
  const obj = r as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    typeof obj.curRating === 'number' &&
    Number.isFinite(obj.curRating) &&
    typeof obj.maxRating === 'number' &&
    Number.isFinite(obj.maxRating)
  );
}

/** Validate that an object is a well-formed SolvedNum */
export function validateSolvedNum(s: unknown): s is SolvedNum {
  if (!s || typeof s !== 'object') return false;
  const obj = s as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    typeof obj.solvedNum === 'number' &&
    Number.isFinite(obj.solvedNum) &&
    obj.solvedNum >= 0
  );
}
