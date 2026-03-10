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

test('设置页 hover/focus 时右侧 icon 应显示', async () => {
  test.setTimeout(60_000);
  const electronApp = await electron.launch({
    args: ['electron/main.js'],
  });

  const window = await getAppWindow(electronApp);
  await window.setViewportSize({ width: 390, height: 844 });
  await window.waitForSelector('.app-bar');

  await window.locator('.nav-item', { hasText: '设置' }).click();
  await window.waitForSelector('.settings-page');

  const aboutRow = window.locator('[aria-label="关于 OJ Flow"]');
  const affordance = aboutRow.locator('.settings-row-affordance');

  await expect(affordance).toHaveCSS('opacity', '0');
  await aboutRow.hover();
  await expect(affordance).toHaveCSS('opacity', '1');

  await window.mouse.move(0, 0);
  await expect(affordance).toHaveCSS('opacity', '0');

  await aboutRow.focus();
  await expect(affordance).toHaveCSS('opacity', '1');

  await electronApp.close();
});

test('收藏编辑模式应支持全选、底部栏与快捷键（200 条）', async () => {
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

    const list = Array.from({ length: 200 }, (_, i) => createContest(`Fav${i}`, i));
    localStorage.setItem('favourite_contests_list', JSON.stringify(list));
    location.reload();
  });

  await window.waitForSelector('.app-bar');

  await window.locator('.nav-item', { hasText: '收藏' }).click();
  await window.waitForSelector('[data-testid="favorite-batch-toggle"]');

  await window.locator('[data-testid="favorite-batch-toggle"]').click();
  await window.waitForSelector('[data-testid="favorite-select-all"]');

  await window.keyboard.down('Control');
  await window.keyboard.press('KeyA');
  await window.keyboard.up('Control');

  await window.waitForSelector('[data-testid="favorite-selected-count"]');
  await expect(window.locator('[data-testid="favorite-selected-count"]')).toHaveText(/200/);

  const bar = window.locator('.batch-bar');
  await expect(bar).toBeVisible();
  await expect(bar).toHaveCSS('height', '56px');

  await window.keyboard.press('Delete');
  await window.locator('.n-dialog button:has-text("删除")').click();

  await window.waitForTimeout(300);

  const remaining = await window.evaluate(() => {
    const raw = localStorage.getItem('favourite_contests_list') || '[]';
    const list = JSON.parse(raw) as Array<{ name: string }>;
    return list.length;
  });
  expect(remaining).toBe(0);

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
