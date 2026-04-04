/** Rating tier color mapping utility */
export interface RatingTier {
  name: string;
  cssVar: string;
  min: number;
  max: number;
}

const tiers: RatingTier[] = [
  { name: 'Grandmaster', cssVar: '--rating-grandmaster', min: 2400, max: Infinity },
  { name: 'Master', cssVar: '--rating-master', min: 2100, max: 2399 },
  { name: 'Expert', cssVar: '--rating-expert', min: 1900, max: 2099 },
  { name: 'Specialist', cssVar: '--rating-specialist', min: 1600, max: 1899 },
  { name: 'Pupil', cssVar: '--rating-pupil', min: 1200, max: 1599 },
  { name: 'Newbie', cssVar: '--rating-newbie', min: 0, max: 1199 },
];

export function getRatingTier(rating: number): RatingTier {
  for (const tier of tiers) {
    if (rating >= tier.min) return tier;
  }
  return tiers[tiers.length - 1];
}

export function getRatingColor(rating: number): string {
  const tier = getRatingTier(rating);
  return `var(${tier.cssVar})`;
}

export function getRatingTierName(rating: number): string {
  return getRatingTier(rating).name;
}
