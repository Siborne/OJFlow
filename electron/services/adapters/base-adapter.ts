import axios, { AxiosInstance, AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import type { PlatformAdapter, FetchResult } from './types';

/** Base class for all platform adapters, providing shared utilities */
export abstract class BaseAdapter implements PlatformAdapter {
  abstract readonly id: string;
  abstract readonly displayName: string;

  protected http: AxiosInstance;

  constructor(options?: { timeoutMs?: number }) {
    this.http = axios.create({
      timeout: options?.timeoutMs ?? 10_000,
      headers: {
        'User-Agent': 'OJFlow/1.3 (Desktop App)',
      },
    });
  }

  /** Parse HTML string into cheerio instance */
  protected parseHtml(html: string): cheerio.CheerioAPI {
    return cheerio.load(html);
  }

  /** Wrap an async operation with unified error handling and timing */
  protected async safeFetch<T>(
    fn: () => Promise<T>,
    fallback: T,
  ): Promise<FetchResult<T>> {
    const start = Date.now();
    try {
      const data = await fn();
      return {
        success: true,
        data,
        platform: this.displayName,
        elapsed: Date.now() - start,
      };
    } catch (error) {
      const elapsed = Date.now() - start;
      const { message, errorType } = this.classifyError(error);
      console.warn(`[${this.id}] fetch failed (${elapsed}ms):`, message);
      return {
        success: false,
        data: fallback,
        platform: this.displayName,
        elapsed,
        error: message,
        errorType,
      };
    }
  }

  /** Classify errors into categories for UI display */
  private classifyError(error: unknown): {
    message: string;
    errorType: 'timeout' | 'network' | 'parse' | 'api' | 'unknown';
  } {
    if (error instanceof AxiosError) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return { message: `Request timeout (${this.id})`, errorType: 'timeout' };
      }
      if (
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNRESET' ||
        error.code === 'EAI_AGAIN' ||
        error.code === 'ECONNREFUSED'
      ) {
        return { message: `Network error: ${error.code}`, errorType: 'network' };
      }
      if (error.response) {
        return { message: `HTTP ${error.response.status}`, errorType: 'api' };
      }
      return { message: error.message, errorType: 'network' };
    }
    if (error instanceof SyntaxError) {
      return { message: 'Data parse error', errorType: 'parse' };
    }
    if (error instanceof Error) {
      return { message: error.message, errorType: 'unknown' };
    }
    return { message: 'Unknown error', errorType: 'unknown' };
  }

  /** Default health check implementation */
  async healthCheck(): Promise<boolean> {
    return true;
  }
}
