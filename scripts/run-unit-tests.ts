const glob = new Bun.Glob('tests/unit/**/*.test.{ts,tsx}');
const files = Array.from(glob.scanSync('.'))
  .filter(file => !file.endsWith('.d.ts'))
  .sort();

if (files.length === 0) {
  console.error('No unit test files found.');
  process.exit(1);
}

let failedFiles = 0;

for (const file of files) {
  console.log(`\n[unit] ${file}`);
  const testPath = `./${file.replaceAll('\\', '/')}`;
  const child = Bun.spawn([process.execPath, 'test', testPath], {
    cwd: process.cwd(),
    env: process.env,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) failedFiles++;
}

if (failedFiles > 0) {
  console.error(`\n${failedFiles} unit test file(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${files.length} unit test files passed.`);

export {};
