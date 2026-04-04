/** Platform icon/color mapping for consistent branding */
export interface PlatformBrand {
  id: string;
  displayName: string;
  cssVar: string;
  /** Short abbreviation for compact displays */
  abbr: string;
}

const platformBrands: PlatformBrand[] = [
  { id: 'codeforces', displayName: 'Codeforces', cssVar: '--platform-codeforces', abbr: 'CF' },
  { id: 'atcoder', displayName: 'AtCoder', cssVar: '--platform-atcoder', abbr: 'AC' },
  { id: 'luogu', displayName: '\u6d1b\u8c37', cssVar: '--platform-luogu', abbr: 'LG' },
  { id: 'leetcode', displayName: '\u529b\u6263', cssVar: '--platform-leetcode', abbr: 'LC' },
  { id: 'nowcoder', displayName: '\u725b\u5ba2', cssVar: '--platform-nowcoder', abbr: 'NC' },
  { id: 'lanqiao', displayName: '\u84dd\u6865\u4e91\u8bfe', cssVar: '--platform-lanqiao', abbr: 'LQ' },
];

const brandMap = new Map<string, PlatformBrand>();

// Index by both id and displayName for O(1) lookup
for (const b of platformBrands) {
  brandMap.set(b.id, b);
  brandMap.set(b.displayName, b);
}

export function getPlatformBrand(nameOrId: string): PlatformBrand | undefined {
  return brandMap.get(nameOrId);
}

export function getPlatformColor(nameOrId: string): string {
  const brand = getPlatformBrand(nameOrId);
  return brand ? `var(${brand.cssVar})` : 'var(--color-text-muted)';
}

export function getPlatformAbbr(nameOrId: string): string {
  const brand = getPlatformBrand(nameOrId);
  return brand?.abbr ?? nameOrId.slice(0, 2).toUpperCase();
}

export { platformBrands };
