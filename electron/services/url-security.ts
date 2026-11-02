const STORE_KEY_PATTERN =
  /^(ui|contest|favorites|usernames|cache|notification|schedule|_migrated)(\.[A-Za-z0-9_:-]+)*$/;

export function isSafeExternalUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.length === 0 || url.length > 2048) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSafeUpdateUrl(url: unknown): url is string {
  if (!isSafeExternalUrl(url)) return false;
  const parsed = new URL(url);
  if (parsed.protocol === 'https:') return true;
  return parsed.protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname);
}

export function isAllowedStoreKey(key: unknown): key is string {
  return typeof key === 'string' && key.length <= 160 && STORE_KEY_PATTERN.test(key);
}
