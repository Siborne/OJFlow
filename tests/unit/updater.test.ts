import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { checkUpdate, getUpdateDialogSpec } from '../../src/updater/checkUpdate';

const originalFetch = globalThis.fetch;
const originalNavigator = (globalThis as any).navigator;

describe('Updater', () => {
  beforeEach(() => {
    process.env.VITE_UPDATE_MANIFEST_URL = 'https://unit.test/update.json';
    process.env.VITE_APP_VERSION = '1.0.1';
    process.env.VITE_UPDATE_RETRY_COUNT = '3';
    process.env.VITE_UPDATE_RETRY_BACKOFF_MS = '1';
    process.env.VITE_UPDATE_TIMEOUT_MS = '50';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    (globalThis as any).navigator = originalNavigator;
    delete process.env.VITE_UPDATE_MANIFEST_URL;
    delete process.env.VITE_APP_VERSION;
    delete process.env.VITE_UPDATE_RETRY_COUNT;
    delete process.env.VITE_UPDATE_RETRY_BACKOFF_MS;
    delete process.env.VITE_UPDATE_TIMEOUT_MS;
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

  it('离线时应返回网络错误并可重试', async () => {
    (globalThis as any).navigator = { onLine: false };
    globalThis.fetch = (async () => new Response('{}', { status: 200 })) as any;

    const info = await checkUpdate();
    expect(info.state).toBe('error');
    expect(info.errorType).toBe('offline');
    const spec = getUpdateDialogSpec(info);
    expect(spec.kind).toBe('error');
    if (spec.kind === 'error') {
      expect(spec.title).toBe('网络错误');
      expect(spec.positiveText).toBe('重试');
      expect(spec.negativeText).toBe('取消');
    }
  });

  it('服务端 502 时应返回服务端错误并包含状态码', async () => {
    globalThis.fetch = (async () => new Response('bad', { status: 502 })) as any;

    const info = await checkUpdate();
    expect(info.state).toBe('error');
    expect(info.errorType).toBe('server');
    expect(info.statusCode).toBe(502);
    const spec = getUpdateDialogSpec(info);
    expect(spec.kind).toBe('error');
    if (spec.kind === 'error') {
      expect(spec.title).toBe('服务端错误');
    }
  });

  it('Failed to fetch 时应重试并最终成功', async () => {
    let callCount = 0;
    globalThis.fetch = (async () => {
      callCount++;
      if (callCount < 3) throw new TypeError('Failed to fetch');
      return new Response(JSON.stringify({ version: 'v1.0.2' }), { status: 200 });
    }) as any;

    const info = await checkUpdate();
    expect(callCount).toBe(3);
    expect(info.state).toBe('update-available');
  });

  it('超时应返回网络错误类型并可重试', async () => {
    globalThis.fetch = (() => new Promise(() => {})) as any;

    const info = await checkUpdate();
    expect(info.state).toBe('error');
    expect(info.errorType).toBe('timeout');
    const spec = getUpdateDialogSpec(info);
    expect(spec.kind).toBe('error');
    if (spec.kind === 'error') {
      expect(spec.title).toBe('网络错误');
    }
  });

  it('未知异常应归类为检查更新失败', async () => {
    globalThis.fetch = (async () => {
      throw new Error('boom');
    }) as any;

    const info = await checkUpdate();
    expect(info.state).toBe('error');
    expect(info.errorType).toBe('unknown');
    const spec = getUpdateDialogSpec(info);
    expect(spec.kind).toBe('error');
    if (spec.kind === 'error') {
      expect(spec.title).toBe('检查更新失败');
    }
  });

  it('版本文件格式错误应返回服务端错误类型并生成错误对话框规格', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ hello: 'world' }), { status: 200 })) as any;

    const info = await checkUpdate();
    expect(info.state).toBe('error');
    expect(info.errorType).toBe('invalid-manifest');
    const spec = getUpdateDialogSpec(info);
    expect(spec.kind).toBe('error');
  });
});
