import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve('site');
const htmlPath = resolve(siteRoot, 'index.html');
const requiredFiles = [
  htmlPath,
  resolve(siteRoot, 'styles.css'),
  resolve(siteRoot, 'app.js'),
  resolve(siteRoot, 'assets/logo.png'),
];

for (const file of requiredFiles) {
  if (!existsSync(file) || statSync(file).size === 0) {
    throw new Error(`Missing or empty site asset: ${file}`);
  }
}

const html = readFileSync(htmlPath, 'utf8');
if (!html.includes('<title>OJFlow')) {
  throw new Error('Official site is missing the OJFlow title.');
}
if (!html.includes('https://github.com/Siborne/OJFlow/releases')) {
  throw new Error('Official site is missing the release download link.');
}

const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
  .map(match => match[1])
  .filter(value => !value.startsWith('#') && !/^https?:/i.test(value));

for (const reference of references) {
  const file = resolve(dirname(htmlPath), reference);
  if (!existsSync(file)) {
    throw new Error(`Broken local site reference: ${reference}`);
  }
}

console.log(`Official site check passed (${references.length} local references).`);
