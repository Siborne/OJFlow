import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

// Helper for fetch environment
const isTauri = typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined';

/**
 * Unified request function handling Tauri (CORS bypass) vs Web (Proxy)
 * @param url The target URL to fetch
 * @param options Fetch options (method, headers, body, etc.)
 * @returns Response object
 */
export const request = async (url: string, options?: RequestInit) => {
  try {
    if (isTauri) {
      console.log(`[Tauri] Fetching ${url}`);
      return await tauriFetch(url, options);
    }
    
    // In Web environment, use the local proxy to bypass CORS
    console.log(`[Web] Fetching ${url} via Proxy`);
    
    // Construct proxy URL
    // We assume the proxy is at /api/proxy relative to the current origin
    const proxyUrl = new URL('/api/proxy', window.location.origin);
    proxyUrl.searchParams.set('url', url);
    
    // For POST requests, the body is passed as-is to the proxy
    // The proxy will read the body and forward it to the target
    
    return await fetch(proxyUrl.toString(), options);
  } catch (error) {
    console.error(`Request failed for ${url}:`, error);
    throw error;
  }
};
