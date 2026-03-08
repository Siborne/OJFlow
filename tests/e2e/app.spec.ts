import { test, expect, _electron as electron } from '@playwright/test';
import { findLatestBuild, parseElectronApp } from 'electron-playwright-helpers';

test('App should launch', async () => {
  const electronApp = await electron.launch({
    args: ['electron/main.js'],
  });

  const window = await electronApp.firstWindow();
  expect(await window.title()).toBe('OJFlow');
  
  // Check if main content is loaded
  await window.waitForSelector('.app-bar');
  const title = await window.textContent('.app-bar h2');
  expect(title).toBe('近期比赛');

  await electronApp.close();
});
