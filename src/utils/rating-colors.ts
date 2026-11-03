/** Rating tier color mapping utility */
export interface RatingTier {
  name: string;
  cssVar: string;
  hex: string;
  min: number;
  max: number;
}

const tiers: RatingTier[] = [
  {
    name: 'Legendary Grandmaster',
    cssVar: '--rating-legendary-grandmaster',
    hex: '#b91c1c',
    min: 3000,
    max: Infinity,
  },
  {
    name: 'International Grandmaster',
    cssVar: '--rating-international-grandmaster',
    hex: '#dc2626',
    min: 2600,
    max: 2999,
  },
  {
    name: 'Grandmaster',
    cssVar: '--rating-grandmaster',
    hex: '#dc2626',
    min: 2400,
    max: 2599,
  },
  {
    name: 'International Master',
    cssVar: '--rating-international-master',
    hex: '#ea580c',
    min: 2300,
    max: 2399,
  },
  {
    name: 'Master',
    cssVar: '--rating-master',
    hex: '#f59e0b',
    min: 2100,
    max: 2299,
  },
  {
    name: 'Candidate Master',
    cssVar: '--rating-candidate-master',
    hex: '#7c3aed',
    min: 1900,
    max: 2099,
  },
  { name: 'Expert', cssVar: '--rating-expert', hex: '#2563eb', min: 1600, max: 1899 },
  { name: 'Specialist', cssVar: '--rating-specialist', hex: '#0891b2', min: 1400, max: 1599 },
  { name: 'Pupil', cssVar: '--rating-pupil', hex: '#15803d', min: 1200, max: 1399 },
  { name: 'Newbie', cssVar: '--rating-newbie', hex: '#64748b', min: 0, max: 1199 },
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

export function getRatingColorHex(rating: number): string {
  return getRatingTier(rating).hex;
}

export function getRatingTierName(rating: number): string {
  return getRatingTier(rating).name;
}
