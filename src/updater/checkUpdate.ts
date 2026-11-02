export type UpdateState = 'up-to-date' | 'update-available' | 'error';

export type UpdateErrorType =
  | 'offline'
  | 'timeout'
  | 'network'
  | 'server'
  | 'invalid-manifest'
  | 'unknown';

export type UpdateInfo = {
  state: UpdateState;
  currentVersion: string;
  latestVersion?: string;
  notes?: string;
  homepageUrl?: string;
  packageUrl?: string;
  errorType?: UpdateErrorType;
  statusCode?: number;
  errorMessage?: string;
};

type UpdateManifest = {
  version: string;
  notes?: string;
  homepageUrl?: string;
  packages?: Partial<Record<NodeJS.Platform, { url: string }>>;
  packageUrl?: string;
};

function normalizeVersion(raw: string): string {
  const v = raw.trim();
  if (!v) return 'v0.0.0';
  return v.startsWith('v') ? v : `v${v}`;
}

function parseSemver(v: string): [number, number, number] {
  const normalized = normalizeVersion(v).slice(1);
  const [major, minor, patch] = normalized
    .split('-')[0]
    .split('.')
    .map(part => Number(part ?? 0));
  return [
    Number.isFinite(major) ? major : 0,
    Number.isFinite(minor) ? minor : 0,
    Number.isFinite(patch) ? patch : 0,
  ];
}

function compareVersions(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  }
  return 0;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function detectManifest(payload: unknown): UpdateManifest | null {
  if (!payload || typeof payload !== 'object') return null;
  const object = payload as Record<string, unknown>;

  if (typeof object.version === 'string') {
    return object as unknown as UpdateManifest;
  }

  if (typeof object.tag_name === 'string') {
    const assets = Array.isArray(object.assets) ? object.assets : [];
    const packageAsset = assets.find(asset => {
      const item = toRecord(asset);
      return typeof item?.browser_download_url === 'string';
    });
    const packageUrl = toRecord(packageAsset)?.browser_download_url as string | undefined;
    return {
      version: object.tag_name,
      notes: typeof object.body === 'string' ? object.body : undefined,
      homepageUrl: typeof object.html_url === 'string' ? object.html_url : undefined,
      packageUrl,
    };
  }

  return null;
}

function pickPackageUrl(manifest: UpdateManifest): string | undefined {
  const byPlatform = manifest.packages?.[process.platform]?.url;
  return byPlatform ?? manifest.packageUrl;
}

export function getUpdateDialogSpec(
  info: UpdateInfo,
):
  | { kind: 'update'; title: string; content: string; positiveText: string; negativeText: string }
  | { kind: 'no-update'; title: string; content: string; positiveText: string }
  | { kind: 'error'; title: string; content: string; positiveText: string; negativeText: string } {
  if (info.state === 'update-available') {
    const notes = info.notes ? `\n\n更新内容:\n${info.notes}` : '';
    return {
      kind: 'update',
      title: '发现新版本',
      content: `当前版本: ${info.currentVersion}\n最新版本: ${info.latestVersion}${notes}`,
      positiveText: '立即更新',
      negativeText: '稍后提醒',
    };
  }

  if (info.state === 'error') {
    const isNetwork =
      info.errorType === 'offline' || info.errorType === 'timeout' || info.errorType === 'network';
    const title = isNetwork
      ? '网络错误'
      : info.errorType === 'server'
        ? '服务端错误'
        : '检查更新失败';
    const extra =
      info.errorType === 'network'
        ? '\n\n可能原因：离线、CORS 限制、证书校验失败或网络波动'
        : info.errorType === 'timeout'
          ? '\n\n可能原因：网络不稳定或服务响应过慢'
          : info.errorType === 'offline'
            ? '\n\n请检查网络连接后重试'
            : info.errorType === 'server'
              ? '\n\n请稍后重试或前往发布页手动更新'
              : '';
    return {
      kind: 'error',
      title,
      content: `${info.errorMessage ?? '无法获取更新信息'}${extra}`,
      positiveText: '重试',
      negativeText: '取消',
    };
  }

  return {
    kind: 'no-update',
    title: '已是最新版本',
    content: `当前版本: ${info.currentVersion}`,
    positiveText: '确定',
  };
}

function getNumberEnv(name: string, fallback: number): number {
  const processEnv = typeof process !== 'undefined' ? process.env : undefined;
  const viteEnv = (
    import.meta as ImportMeta & {
      env?: Record<string, string | boolean | undefined>;
    }
  ).env;
  const raw =
    processEnv?.[name] ?? (typeof viteEnv?.[name] === 'string' ? viteEnv[name] : undefined);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      try {
        controller?.abort();
      } catch {
        // Ignore abort failures and still surface the timeout.
      }
      reject(new TimeoutError(`请求超时: ${timeoutMs}ms`));
    }, timeoutMs);
  });

  const fetchPromise = fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: controller?.signal,
  });

  try {
    return (await Promise.race([fetchPromise, timeoutPromise])) as Response;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function classifyFetchError(e: unknown): { type: UpdateErrorType; message: string } {
  const message = e instanceof Error ? e.message : typeof e === 'string' ? e : '未知错误';
  if (e instanceof TimeoutError) return { type: 'timeout', message };
  if (toRecord(e)?.name === 'AbortError') {
    return { type: 'timeout', message: '请求超时' };
  }
  if (typeof message === 'string' && /Failed to fetch/i.test(message)) {
    return { type: 'network', message: 'Failed to fetch' };
  }
  return { type: 'unknown', message };
}

export async function checkUpdate(): Promise<UpdateInfo> {
  const processEnv = typeof process !== 'undefined' ? process.env : undefined;
  const viteEnv = (
    import.meta as ImportMeta & {
      env?: Record<string, string | boolean | undefined>;
    }
  ).env;
  const manifestUrl =
    processEnv?.VITE_UPDATE_MANIFEST_URL ??
    (typeof viteEnv?.VITE_UPDATE_MANIFEST_URL === 'string'
      ? viteEnv.VITE_UPDATE_MANIFEST_URL
      : undefined);
  const rawCurrent =
    processEnv?.VITE_APP_VERSION ??
    (typeof viteEnv?.VITE_APP_VERSION === 'string' ? viteEnv.VITE_APP_VERSION : undefined);
  const currentVersion = normalizeVersion(rawCurrent ?? '0.0.0');

  if (!manifestUrl) {
    return {
      state: 'error',
      currentVersion,
      errorType: 'unknown',
      errorMessage: '未配置更新地址（VITE_UPDATE_MANIFEST_URL）',
    };
  }

  if (isOffline()) {
    return {
      state: 'error',
      currentVersion,
      errorType: 'offline',
      errorMessage: '当前处于离线状态，无法检查更新',
    };
  }

  const timeoutMs = getNumberEnv('VITE_UPDATE_TIMEOUT_MS', 8_000);
  const retryCount = Math.max(1, Math.min(3, getNumberEnv('VITE_UPDATE_RETRY_COUNT', 3)));
  const backoffBaseMs = getNumberEnv('VITE_UPDATE_RETRY_BACKOFF_MS', 1_000);

  try {
    let lastErr: { type: UpdateErrorType; message: string } | undefined;
    let lastStatus: number | undefined;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        const res = await fetchWithTimeout(manifestUrl, timeoutMs);
        if (!res.ok) {
          lastStatus = res.status;
          const canRetry = res.status >= 500 && attempt < retryCount;
          console.warn('[updater] http error', { status: res.status, attempt, manifestUrl });
          if (canRetry) {
            await sleep(backoffBaseMs * attempt);
            continue;
          }
          return {
            state: 'error',
            currentVersion,
            errorType: 'server',
            statusCode: res.status,
            errorMessage: `服务端错误: ${res.status}`,
          };
        }

        const payload = await res.json();
        const manifest = detectManifest(payload);
        if (!manifest) {
          console.warn('[updater] invalid manifest', { attempt, manifestUrl });
          return {
            state: 'error',
            currentVersion,
            errorType: 'invalid-manifest',
            errorMessage: '版本文件格式不正确',
          };
        }

        const latestVersion = normalizeVersion(manifest.version);
        const packageUrl = pickPackageUrl(manifest);

        if (compareVersions(latestVersion, currentVersion) <= 0) {
          return {
            state: 'up-to-date',
            currentVersion,
            latestVersion,
            homepageUrl: manifest.homepageUrl,
          };
        }

        return {
          state: 'update-available',
          currentVersion,
          latestVersion,
          notes: manifest.notes,
          homepageUrl: manifest.homepageUrl,
          packageUrl,
        };
      } catch (e) {
        const classified = classifyFetchError(e);
        lastErr = classified;
        console.warn('[updater] fetch failed', {
          attempt,
          manifestUrl,
          errorType: classified.type,
          errorMessage: classified.message,
        });

        const canRetry =
          (classified.type === 'timeout' || classified.type === 'network') && attempt < retryCount;
        if (canRetry) {
          await sleep(backoffBaseMs * attempt);
          continue;
        }
        break;
      }
    }

    if (lastErr) {
      return {
        state: 'error',
        currentVersion,
        errorType: lastErr.type,
        statusCode: lastStatus,
        errorMessage: lastErr.type === 'timeout' ? '网络超时，请稍后重试' : lastErr.message,
      };
    }

    return {
      state: 'error',
      currentVersion,
      errorType: 'unknown',
      errorMessage: '检查更新失败',
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      state: 'error',
      currentVersion,
      errorType: 'unknown',
      errorMessage: message || '检查更新时发生异常',
    };
  }
}
