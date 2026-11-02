import * as cheerio from 'cheerio';

export const PROBLEM_CACHE_TTL = 6 * 60 * 60 * 1000;
export const PROBLEM_REQUEST_TIMEOUT_MS = 15_000;

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

export interface CachedLoader<T> {
  load: () => Promise<T>;
  clear: () => void;
}

export function createCachedLoader<T>(
  loader: () => Promise<T>,
  ttl = PROBLEM_CACHE_TTL,
): CachedLoader<T> {
  let cached: CacheEntry<T> | null = null;
  let inflight: Promise<T> | null = null;

  return {
    load: () => {
      if (cached && Date.now() - cached.fetchedAt < ttl) {
        return Promise.resolve(cached.data);
      }
      if (inflight) return inflight;

      inflight = loader()
        .then(data => {
          cached = { data, fetchedAt: Date.now() };
          return data;
        })
        .finally(() => {
          inflight = null;
        });
      return inflight;
    },
    clear: () => {
      cached = null;
      inflight = null;
    },
  };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = PROBLEM_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json, text/html;q=0.9, */*;q=0.8');
  }
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', 'OJFlow/1.3 (Desktop App)');
  }
  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
      headers,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetchWithTimeout(url, init);
  return (await response.json()) as T;
}

export async function postJson<T>(url: string, body: unknown, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const response = await fetchWithTimeout(url, {
    ...init,
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  });
  return (await response.json()) as T;
}

export async function fetchText(url: string, init: RequestInit = {}): Promise<string> {
  const response = await fetchWithTimeout(url, init);
  return response.text();
}

export function parseHtml(html: string): cheerio.CheerioAPI {
  return cheerio.load(html);
}

export function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function toAbsoluteUrl(baseUrl: string, href: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

export function extractNumericId(value: string): string {
  const match = value.match(/(\d+)(?!.*\d)/);
  return match?.[1] ?? value;
}

export function clampPageSize(value: unknown, fallback = 60): number {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(10, Math.min(100, parsed));
}

export function clampPage(value: unknown): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return '请求超时';
    return error.message;
  }
  return '未知错误';
}
