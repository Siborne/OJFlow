export const PLATFORM_LOGOS: Record<string, string> = {
  Codeforces: new URL('../assets/platforms/Codeforces.jpg', import.meta.url).href,
  AtCoder: new URL('../assets/platforms/AtCoder.jpg', import.meta.url).href,
  力扣: new URL('../assets/platforms/LeetCode.jpg', import.meta.url).href,
  洛谷: new URL('../assets/platforms/Luogu.jpg', import.meta.url).href,
  牛客: new URL('../assets/platforms/Nowcoder.jpg', import.meta.url).href,
  VJudge: new URL('../assets/platforms/VJudge.jpg', import.meta.url).href,
  HDU: new URL('../assets/platforms/hdu.jpg', import.meta.url).href,
  POJ: new URL('../assets/platforms/poj.jpg', import.meta.url).href,
  蓝桥云课: new URL('../assets/platforms/Lanqiao.jpg', import.meta.url).href,
  QOJ: new URL('../assets/platforms/qoj.jpg', import.meta.url).href,
  Other: new URL('../assets/platforms/Other.jpg', import.meta.url).href,
};

export function getPlatformLogo(platform: string | undefined): string | undefined {
  return platform ? PLATFORM_LOGOS[platform] : undefined;
}
