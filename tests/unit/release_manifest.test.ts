import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '../..');

function readProjectFile(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8');
}

describe('release manifest', () => {
  const packageJson = JSON.parse(readProjectFile('package.json')) as { version: string };

  test('keeps release notes for the package version', () => {
    const notesPath = join(root, 'docs/releases', `v${packageJson.version}.md`);
    expect(existsSync(notesPath)).toBe(true);
    expect(readFileSync(notesPath, 'utf8').startsWith(`# OJFlow v${packageJson.version}`)).toBe(
      true,
    );
  });

  test('publishes tagged builds with the versioned release notes', () => {
    const workflow = readProjectFile('.github/workflows/release.yml');
    expect(workflow).toContain("      - 'v*'");
    expect(workflow).toContain('body_path: docs/releases/${{ github.ref_name }}.md');
    expect(workflow).toContain('draft: false');
  });
});
