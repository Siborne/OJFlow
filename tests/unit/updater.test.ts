import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { checkUpdate, getUpdateDialogSpec } from '../../src/updater/checkUpdate';

const originalFetch = globalThis.fetch;

describe('Updater', () => {
  beforeEach(() => {
    process.env.VITE_UPDATE_MANIFEST_URL = 'https://unit.test/update.json';
    process.env.VITE_APP_VERSION = '1.0.1';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.VITE_UPDATE_MANIFEST_URL;
    delete process.env.VITE_APP_VERSION;
  });

  it('远端版本更低时应提示已是最新版本', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ version: 'v1.0.0', notes: 'old' }), { status: 200 })) as any;

    const info = await checkUpdate();
    expect(info.state).toBe('up-to-date');
    const spec = getUpdateDialogSpec(info);
    expect(spec.kind).toBe('no-update');
  });

  it('远端版本更高时应返回可更新并生成对话框规格', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          version: 'v1.0.2',
          notes: 'fix',
          homepageUrl: 'https://example.com',
          packages: { win32: { url: 'https://example.com/win.exe' } },
        }),
        { status: 200 }
      )) as any;

    const info = await checkUpdate();
    expect(info.state).toBe('update-available');
    expect(info.packageUrl).toBe('https://example.com/win.exe');
    const spec = getUpdateDialogSpec(info);
    expect(spec.kind).toBe('update');
    if (spec.kind === 'update') {
      expect(spec.positiveText).toBe('立即更新');
      expect(spec.negativeText).toBe('稍后提醒');
    }
  });

  it('请求异常时应返回错误并生成错误对话框规格', async () => {
    globalThis.fetch = (async () => {
      throw new Error('network');
    }) as any;

    const info = await checkUpdate();
    expect(info.state).toBe('error');
    const spec = getUpdateDialogSpec(info);
    expect(spec.kind).toBe('error');
  });
});

