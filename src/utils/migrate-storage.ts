/** One-time migration from localStorage to electron-store */
export async function migrateFromLocalStorage(): Promise<void> {
  const eStore = typeof window !== 'undefined' ? window.store : undefined;
  if (!eStore) return;

  try {
    const migrated = await eStore.get('_migrated');
    if (migrated) return;

    // Migrate UI settings
    const themeScheme = localStorage.getItem('theme_scheme');
    const colorMode = localStorage.getItem('color_mode');
    const locale = localStorage.getItem('locale');
    if (themeScheme) await eStore.set('ui.themeScheme', themeScheme);
    if (colorMode) await eStore.set('ui.colorMode', colorMode);
    if (locale) await eStore.set('ui.locale', locale);

    // Migrate contest settings
    const maxDays = localStorage.getItem('max_crawl_days');
    const hideDate = localStorage.getItem('hide_date');
    if (maxDays) await eStore.set('contest.maxCrawlDays', Number(maxDays));
    if (hideDate) await eStore.set('contest.hideDate', hideDate === '1');

    // Migrate favorites
    const favRaw = localStorage.getItem('favourite_contests_list');
    if (favRaw) {
      try {
        const favs = JSON.parse(favRaw);
        if (Array.isArray(favs)) {
          await eStore.set('favorites', favs);
        }
      } catch {
        // Skip invalid JSON
      }
    }

    // Migrate usernames
    const platforms = [
      'Codeforces',
      'AtCoder',
      '\u529b\u6263',
      '\u6d1b\u8c37',
      '\u725b\u5ba2',
      'VJudge',
      'HDU',
      'POJ',
      'QOJ',
    ];
    const usernames: Record<string, string> = {};
    for (const p of platforms) {
      const name = localStorage.getItem(`rating_username_${p}`);
      if (name) usernames[p] = name;
    }
    if (Object.keys(usernames).length > 0) {
      await eStore.set('usernames', usernames);
    }

    await eStore.set('_migrated', true);
  } catch (error) {
    console.error('Migration failed:', error);
    // Migration failure should not block startup - will retry next time
  }
}
