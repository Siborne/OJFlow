import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page,
} from '@playwright/test';

async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage', 'electron-dist/electron/main.js'],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      VITE_UPDATE_MANIFEST_URL: '',
    },
  });
  const page = await app.firstWindow();
  await page.waitForSelector('.app-bar');
  return { app, page };
}

test('应用启动并显示数据工作台', async () => {
  const { app, page } = await launchApp();
  await expect(page.locator('.app-bar h2')).toHaveText('数据工作台');
  await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible();
  await expect(page.getByRole('button', { name: '最小化' })).toBeVisible();
  await expect(page.getByRole('button', { name: '关闭' })).toBeVisible();
  await page.getByRole('button', { name: '最大化' }).click();
  await expect(page.getByRole('button', { name: '还原窗口' })).toBeVisible();
  await page.getByRole('button', { name: '还原窗口' }).click();
  await expect(page.getByText('我的日程')).toBeVisible();
  await app.close();
});

test('设置页可以切换完整模式、暗色与强调色', async () => {
  const { app, page } = await launchApp();
  await page.locator('[data-nav-key="settings"]').click();
  await expect(page.locator('[data-nav-key="settings"]')).toHaveAttribute('aria-current', 'page');
  await expect(
    page.locator('#settings-section-appearance').getByText('界面模式', { exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: '完整模式' }).click();
  await page.getByRole('button', { name: '暗色' }).click();
  await page.getByRole('button', { name: '琥珀橙' }).click();
  await page.getByRole('button', { name: '晴空蓝' }).click();
  await page.getByRole('button', { name: '粘土' }).click();
  await page.getByRole('button', { name: '启动与窗口', exact: true }).click();
  await expect(page.getByText('开机自动启动')).toBeVisible();
  await expect(page.getByText('关闭按钮行为')).toBeVisible();
  await page.getByRole('button', { name: '外观与布局', exact: true }).click();
  await page.getByTestId('settings-language').getByRole('button', { name: '跟随系统' }).click();

  await expect(page.locator('html')).toHaveAttribute('data-mode', 'full');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-scheme', 'sky');
  await expect(page.locator('html')).toHaveAttribute('data-surface', 'clay');
  await expect(page.locator('html')).toHaveAttribute('data-locale', 'system');
  await app.close();
});

test('收藏页可以添加并删除手动比赛', async () => {
  const { app, page } = await launchApp();
  await page.getByRole('button', { name: '收藏' }).click();
  await page.getByRole('button', { name: '添加手动比赛' }).click();

  await page.getByPlaceholder('比赛名称').fill('E2E Manual Round');
  await page.locator('input[type="datetime-local"]').fill('2026-12-01T20:00');
  await page.getByRole('button', { name: '保存' }).click();

  await expect(page.getByText('E2E Manual Round')).toBeVisible();
  await page.getByRole('button', { name: '批量管理' }).click();
  await page.getByTestId('favorite-checkbox-E2E Manual Round').check();
  await page.getByTestId('favorite-delete-selected').click();
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await expect(page.getByText('E2E Manual Round')).toHaveCount(0);
  await app.close();
});

test('简洁模式仅显示图标，完整模式显示分组功能', async () => {
  const { app, page } = await launchApp();
  await page.locator('[data-nav-key="settings"]').click();
  await page.getByRole('button', { name: '简洁模式' }).click();

  const contestButton = page.getByRole('button', { name: '比赛', exact: true });
  await expect(contestButton).toHaveText('');

  await page.getByRole('button', { name: '完整模式' }).click();
  await expect(contestButton).toContainText('比赛');
  await expect(page.getByText('探索', { exact: true })).toBeVisible();
  await expect(page.getByText('数据', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'CF 报告' })).toBeVisible();
  await expect(page.getByRole('button', { name: '解题数' })).toBeVisible();
  await page.getByRole('button', { name: '竞赛档案', exact: true }).click();
  await expect(page.getByRole('heading', { name: '竞赛档案' })).toBeVisible();
  await expect(page.getByRole('button', { name: '打开 CPCFinder' })).toBeVisible();
  await expect(page.getByRole('button', { name: '打开 OIerDB' })).toBeVisible();
  await app.close();
});

test('题目页支持多平台、扩展标签和英文标签', async () => {
  const { app, page } = await launchApp();
  await page.locator('[data-nav-key="settings"]').click();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(
    page.locator('#settings-section-appearance').getByText('Interface mode', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Contests', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Upcoming Contests' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Today', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Problems', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Problem Atlas' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'All Platforms' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'LeetCode', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Luogu', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nowcoder', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'QOJ', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dynamic Programming' })).toBeVisible();
  await page.getByRole('button', { name: 'Show more topics' }).click();
  await expect(page.getByRole('button', { name: 'Fenwick Tree' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply' })).toBeVisible();
  await app.close();
});

test('工作台可以创建并持久化日程', async () => {
  const { app, page } = await launchApp();
  await page.getByRole('button', { name: '添加日程' }).click();
  await page.getByPlaceholder('日程标题').fill('E2E DP plan');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('E2E DP plan')).toBeVisible();

  await page.reload();
  await page.waitForSelector('.app-bar');
  await expect(page.getByText('E2E DP plan')).toBeVisible();
  await page.locator('[data-nav-key="schedule"]').click();
  await expect(page.getByRole('heading', { name: '日程中心' })).toBeVisible();
  await expect(page.getByText('E2E DP plan')).toBeVisible();
  await page.locator('[data-nav-key="dashboard"]').click();
  await page.getByRole('button', { name: '标记完成' }).click();
  await expect(page.getByRole('button', { name: '恢复待办' })).toBeVisible();
  await app.close();
});

test('练习收件箱可以接收 Competitive Companion 题目并保存状态', async () => {
  const { app, page } = await launchApp();
  await expect
    .poll(() => page.evaluate(() => window.api.getCompanionStatus()))
    .toMatchObject({ running: true });
  const status = await page.evaluate(() => window.api.getCompanionStatus());
  expect(status.port).toBeTruthy();
  const response = await fetch(`http://127.0.0.1:${status.port}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'A. E2E Watermelon',
      group: 'OJFlow E2E Round',
      url: 'https://codeforces.com/contest/4/problem/A',
      tests: [{ input: '8\n', output: 'YES\n' }],
      timeLimit: 1000,
      memoryLimit: 256,
    }),
  });
  expect(response.ok).toBe(true);

  await page.locator('[data-nav-key="practice"]').click();
  await expect(page.getByRole('heading', { name: 'A. E2E Watermelon' })).toBeVisible();
  await expect(page.getByText('YES', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '开始练习' }).click();
  await expect(page.getByText('练习中', { exact: true }).first()).toBeVisible();
  await page.getByPlaceholder('记录思路、错误原因、复杂度和下次复习重点...').fill('parity');
  await page.getByRole('button', { name: '保存笔记' }).click();
  await page.locator('[data-testid="practice-code-editor"] .cm-content').click();
  await page.keyboard.type('int main() { return 0; }');
  await page.getByRole('button', { name: '保存代码' }).click();
  await page.reload();
  await page.waitForSelector('.app-bar');
  await expect(page.getByRole('heading', { name: 'A. E2E Watermelon' })).toBeVisible();
  await expect(page.locator('textarea[aria-label="练习笔记"]')).toHaveValue('parity');
  await expect(page.locator('[data-testid="practice-code-editor"]')).toContainText('int main()');
  await app.close();
});

test('模板库可以创建、搜索和复制模板', async () => {
  const { app, page } = await launchApp();
  await page.locator('[data-nav-key="templates"]').click();
  await page.getByTestId('template-create').click();
  await page.getByLabel('模板标题').fill('E2E Segment Tree');
  await page.getByLabel('分类').fill('E2E');
  await page
    .locator('[data-testid="template-content"] .cm-content')
    .waitFor({ state: 'visible', timeout: 10000 });
  await page.locator('[data-testid="template-content"] .cm-content').click({ force: true });
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Segment Tree' })).toBeVisible();
  await page.getByRole('button', { name: '复制模板' }).click();
  await expect(page.getByText('模板已复制')).toBeVisible();
  await app.close();
});
