import { test, expect, _electron as electron } from '@playwright/test';

async function getAppWindow(electronApp: any) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const windows = electronApp.windows();
    for (const w of windows) {
      const url = w.url();
      if (!url.startsWith('devtools://')) return w;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return electronApp.firstWindow();
}

test('App should launch', async () => {
  const electronApp = await electron.launch({
    args: ['electron/main.js'],
  });

  const window = await getAppWindow(electronApp);
  
  // Check if main content is loaded
  await window.waitForSelector('.app-bar');
  const title = await window.textContent('.app-bar h2');
  expect(title).toBe('近期比赛');

  await electronApp.close();
});

test('收藏页面应支持跨页多选并批量删除', async () => {
  test.setTimeout(60_000);
  const electronApp = await electron.launch({
    args: ['electron/main.js'],
  });

  const window = await getAppWindow(electronApp);
  await window.setViewportSize({ width: 390, height: 844 });

  await window.waitForSelector('.app-bar');

  await window.evaluate(() => {
    const createContest = (name: string, idx: number) => ({
      name,
      startTime: '2026-01-01 00:00',
      endTime: '2026-01-01 01:00',
      duration: '1 小时 0 分钟',
      platform: 'Codeforces',
      link: `https://example.com/${encodeURIComponent(name)}`,
      startHourMinute: '00:00',
      endHourMinute: '01:00',
      startTimeSeconds: idx,
      durationSeconds: 3600,
      formattedStartTime: '2026-01-01 00:00',
      formattedEndTime: '2026-01-01 01:00',
      fomattedDuration: '1 小时 0 分钟',
    });

    const list = Array.from({ length: 25 }, (_, i) => createContest(`Fav${i}`, i));
    localStorage.setItem('favourite_contests_list', JSON.stringify(list));
    location.reload();
  });

  await window.waitForSelector('.app-bar');

  await window.locator('.nav-item', { hasText: '收藏' }).click();
  await window.waitForSelector('[data-testid="favorite-batch-toggle"]');

  await window.locator('[data-testid="favorite-batch-toggle"]').click();

  await window.locator('[data-testid="favorite-checkbox-Fav0"]').click();

  await window.locator('[data-testid="favorite-pagination"] >> text=2').first().click();
  await window.waitForSelector('[data-testid="favorite-checkbox-Fav20"]');
  await window.locator('[data-testid="favorite-checkbox-Fav20"]').click();

  await window.locator('[data-testid="favorite-delete-selected"]').click();
  await window.locator('.n-dialog button:has-text("删除")').click();

  await window.waitForTimeout(300);

  const remainingNames = await window.evaluate(() => {
    const raw = localStorage.getItem('favourite_contests_list') || '[]';
    const list = JSON.parse(raw) as Array<{ name: string }>;
    return list.map(x => x.name);
  });

  expect(remainingNames.includes('Fav0')).toBe(false);
  expect(remainingNames.includes('Fav20')).toBe(false);
  expect(remainingNames.length).toBe(23);

  await electronApp.close();
});
