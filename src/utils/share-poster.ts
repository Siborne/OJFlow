export interface SharePosterItem {
  label: string;
  value: number;
  color: string;
}

export interface SharePosterData {
  locale: 'zh-CN' | 'en-US';
  handle: string;
  platform: string;
  rating: number;
  maxRating: number;
  tier: string;
  ratingColor: string;
  totalSolved: number;
  solved: SharePosterItem[];
  topics: SharePosterItem[];
  completedSchedule: number;
  generatedAt: number;
}

export type SharePosterStyle = 'midnight' | 'paper' | 'aurora';

export interface SharePosterOptions {
  showRating: boolean;
  showPlatforms: boolean;
  showTopics: boolean;
  showSchedule: boolean;
}

const DEFAULT_OPTIONS: SharePosterOptions = {
  showRating: true,
  showPlatforms: true,
  showTopics: true,
  showSchedule: true,
};

interface PosterPalette {
  backgroundStart: string;
  backgroundEnd: string;
  orbPrimary: string;
  orbSecondary: string;
  text: string;
  muted: string;
  panel: string;
  border: string;
  track: string;
  accent: string;
  chip: string;
  chipBorder: string;
}

const PALETTES: Record<SharePosterStyle, PosterPalette> = {
  midnight: {
    backgroundStart: '#08151e',
    backgroundEnd: '#142d39',
    orbPrimary: '#2dd4bf',
    orbSecondary: '#f59e0b',
    text: '#f7fbfd',
    muted: '#8fa3b3',
    panel: '#102632',
    border: '#244250',
    track: '#1e3442',
    accent: '#2dd4bf',
    chip: '#142a37',
    chipBorder: '#264655',
  },
  paper: {
    backgroundStart: '#f7f1e6',
    backgroundEnd: '#e8decd',
    orbPrimary: '#0f766e',
    orbSecondary: '#d97706',
    text: '#201d18',
    muted: '#746a5c',
    panel: '#fffaf0',
    border: '#d8cab5',
    track: '#ded2c0',
    accent: '#0f766e',
    chip: '#f1e8d9',
    chipBorder: '#d8cab5',
  },
  aurora: {
    backgroundStart: '#0d1126',
    backgroundEnd: '#2a1536',
    orbPrimary: '#f0abfc',
    orbSecondary: '#2dd4bf',
    text: '#fff7ff',
    muted: '#b8a8c9',
    panel: '#171b38',
    border: '#3b4168',
    track: '#292d52',
    accent: '#f0abfc',
    chip: '#201e43',
    chipBorder: '#454b78',
  },
};

const WIDTH = 1200;
const HEIGHT = 1500;

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function platformRows(
  items: SharePosterItem[],
  total: number,
  palette: PosterPalette,
  startY: number,
): string {
  return items
    .slice(0, 5)
    .map((item, index) => {
      const y = startY + index * 66;
      const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
      const width = Math.max(6, Math.round((percent / 100) * 480));
      return `
        <text x="110" y="${y}" fill="${palette.text}" font-size="24">${escapeXml(
          truncate(item.label, 20),
        )}</text>
        <text x="640" y="${y}" fill="${palette.muted}" font-size="22" text-anchor="end">${item.value.toLocaleString()} · ${percent}%</text>
        <rect x="110" y="${y + 16}" width="530" height="10" rx="5" fill="${palette.track}"/>
        <rect x="110" y="${y + 16}" width="${width}" height="10" rx="5" fill="${item.color}"/>
      `;
    })
    .join('');
}

function platformDonut(items: SharePosterItem[], total: number, palette: PosterPalette): string {
  const radius = 82;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = items
    .slice(0, 5)
    .map(item => {
      if (item.value <= 0) return '';
      const length = total > 0 ? (item.value / total) * circumference : 0;
      const circle = `
        <circle cx="930" cy="980" r="${radius}" fill="none" stroke="${item.color}" stroke-width="24"
          stroke-linecap="butt" stroke-dasharray="${Math.max(0, length - 2)} ${circumference}"
          stroke-dashoffset="${-offset}" transform="rotate(-90 930 980)"/>
      `;
      offset += length;
      return circle;
    })
    .join('');
  return `
    <circle cx="930" cy="980" r="${radius}" fill="none" stroke="${palette.track}" stroke-width="24"/>
    ${segments}
    <circle cx="930" cy="980" r="57" fill="${palette.panel}" stroke="${palette.border}"/>
    <text x="930" y="974" fill="${palette.text}" font-size="34" font-weight="760" text-anchor="middle">${total.toLocaleString()}</text>
    <text x="930" y="1002" fill="${palette.muted}" font-size="16" text-anchor="middle">AC</text>
  `;
}

function topicChips(topics: SharePosterItem[], startY: number, palette: PosterPalette): string {
  return topics
    .slice(0, 6)
    .map((topic, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = 110 + column * 325;
      const y = startY + row * 68;
      return `
        <rect x="${x}" y="${y}" width="290" height="48" rx="16" fill="${palette.chip}" stroke="${palette.chipBorder}"/>
        <text x="${x + 18}" y="${y + 31}" fill="${palette.text}" font-size="20">${escapeXml(
          truncate(topic.label, 15),
        )}</text>
        <text x="${x + 268}" y="${y + 31}" fill="${palette.accent}" font-size="18" text-anchor="end">${topic.value}</text>
      `;
    })
    .join('');
}

export function buildSharePosterSvg(
  data: SharePosterData,
  style: SharePosterStyle = 'midnight',
  options: SharePosterOptions = DEFAULT_OPTIONS,
): string {
  const palette = PALETTES[style];
  const isZh = data.locale === 'zh-CN';
  const title = isZh ? '我的算法竞赛训练快照' : 'My Competitive Programming Snapshot';
  const ratingLabel = isZh ? '当前 Rating' : 'Current rating';
  const maxLabel = isZh ? '历史最高' : 'Peak rating';
  const solvedLabel = isZh ? '累计解题' : 'Problems solved';
  const platformLabel = isZh ? '平台分布' : 'Platform breakdown';
  const topicsLabel = isZh ? '训练主题' : 'Practice topics';
  const scheduleLabel = isZh ? '已完成日程' : 'Completed schedules';
  const generated = new Date(data.generatedAt).toLocaleDateString(data.locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const ratio = data.totalSolved > 0 ? Math.min(1, data.totalSolved / 3000) : 0;
  const circumference = 2 * Math.PI * 96;
  const visiblePlatforms = Math.min(5, data.solved.length);
  const afterRatingY = options.showRating ? 740 : 240;
  const platformTitleY = afterRatingY + 46;
  const platformRowsY = platformTitleY + 64;
  const topicsTitleY = options.showPlatforms
    ? platformRowsY + visiblePlatforms * 66 + 26
    : platformTitleY + 40;
  const topicsStartY = topicsTitleY + 48;

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${palette.backgroundStart}"/>
        <stop offset="0.58" stop-color="${palette.backgroundStart}"/>
        <stop offset="1" stop-color="${palette.backgroundEnd}"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.8" cy="0.1" r="0.9">
        <stop offset="0" stop-color="${palette.orbPrimary}" stop-opacity="0.28"/>
        <stop offset="1" stop-color="${palette.orbPrimary}" stop-opacity="0"/>
      </radialGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="28" flood-color="#000" flood-opacity="0.28"/>
      </filter>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
    <circle cx="1010" cy="110" r="220" fill="${palette.orbPrimary}" opacity="0.08"/>
    <circle cx="120" cy="1360" r="260" fill="${palette.orbSecondary}" opacity="0.07"/>

    <text x="90" y="96" fill="${palette.accent}" font-size="22" font-weight="700" letter-spacing="6">OJFLOW</text>
    <text x="90" y="150" fill="${palette.text}" font-size="48" font-weight="760">${escapeXml(title)}</text>
    <text x="90" y="194" fill="${palette.muted}" font-size="21">${escapeXml(data.platform)} · ${escapeXml(
      data.handle,
    )}</text>
    <text x="1110" y="112" fill="${palette.muted}" font-size="20" text-anchor="end">${escapeXml(
      generated,
    )}</text>

    ${
      options.showRating
        ? `<g filter="url(#shadow)">
            <rect x="90" y="240" width="1020" height="470" rx="42" fill="${palette.panel}" stroke="${palette.border}"/>
            <circle cx="315" cy="475" r="116" fill="none" stroke="${palette.track}" stroke-width="24"/>
            <circle cx="315" cy="475" r="116" fill="none" stroke="${data.ratingColor}" stroke-width="24"
              stroke-linecap="round" stroke-dasharray="${circumference * 0.7} ${circumference}"
              transform="rotate(-90 315 475)" opacity="0.92"/>
            <text x="315" y="472" fill="${data.ratingColor}" font-size="82" font-weight="800" text-anchor="middle">${data.rating}</text>
            <text x="315" y="512" fill="${palette.muted}" font-size="21" text-anchor="middle">${ratingLabel}</text>
            <text x="315" y="548" fill="${data.ratingColor}" font-size="24" font-weight="700" text-anchor="middle">${escapeXml(
              data.tier,
            )}</text>
            <text x="520" y="350" fill="${palette.muted}" font-size="22">${maxLabel}</text>
            <text x="520" y="408" fill="${palette.text}" font-size="58" font-weight="760">${data.maxRating}</text>
            <text x="780" y="350" fill="${palette.muted}" font-size="22">${solvedLabel}</text>
            <text x="780" y="408" fill="${palette.text}" font-size="58" font-weight="760">${data.totalSolved.toLocaleString()}</text>
            <rect x="520" y="462" width="490" height="14" rx="7" fill="${palette.track}"/>
            <rect x="520" y="462" width="${Math.max(12, Math.round(490 * ratio))}" height="14" rx="7" fill="${palette.accent}"/>
            ${
              options.showSchedule
                ? `<text x="520" y="516" fill="${palette.muted}" font-size="20">${scheduleLabel}</text>
                   <text x="1010" y="516" fill="${palette.text}" font-size="28" font-weight="700" text-anchor="end">${data.completedSchedule}</text>`
                : ''
            }
          </g>`
        : ''
    }

    ${
      options.showPlatforms
        ? `<text x="90" y="${platformTitleY}" fill="${palette.text}" font-size="34" font-weight="720">${platformLabel}</text>
           ${platformRows(data.solved, data.totalSolved, palette, platformRowsY)}
           ${platformDonut(data.solved, data.totalSolved, palette)}`
        : ''
    }

    ${
      options.showTopics
        ? `<text x="90" y="${topicsTitleY}" fill="${palette.text}" font-size="34" font-weight="720">${topicsLabel}</text>
           ${topicChips(data.topics, topicsStartY, palette)}`
        : ''
    }

    <line x1="90" y1="1415" x2="1110" y2="1415" stroke="${palette.border}"/>
    <text x="90" y="1458" fill="${palette.muted}" font-size="20">OJFlow Practice Studio · siborne.top/OJFlow</text>
    <text x="1110" y="1458" fill="${palette.accent}" font-size="20" text-anchor="end">KEEP SOLVING</text>
  </svg>`;
}

export function createSharePosterDataUrl(
  data: SharePosterData,
  style: SharePosterStyle = 'midnight',
  options: SharePosterOptions = DEFAULT_OPTIONS,
): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    buildSharePosterSvg(data, style, options),
  )}`;
}

export async function downloadSharePosterPng(
  data: SharePosterData,
  style: SharePosterStyle = 'midnight',
  options: SharePosterOptions = DEFAULT_OPTIONS,
): Promise<void> {
  const svgUrl = createSharePosterDataUrl(data, style, options);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Unable to render share poster'));
    image.src = svgUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  context.drawImage(image, 0, 0, WIDTH, HEIGHT);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Unable to export share poster');
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = `ojflow-share-${data.handle || 'practice'}-${style}.png`;
  anchor.click();
  URL.revokeObjectURL(downloadUrl);
}
