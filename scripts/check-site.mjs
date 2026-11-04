import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const siteRoot = resolve('site');
const htmlPath = resolve(siteRoot, 'index.html');
const readmePath = resolve('README.md');
const requiredFiles = [
  htmlPath,
  readmePath,
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
for (const needle of [
  'Competitive Companion',
  '练习收件箱',
  '练习闭环与分享',
  '训练数据海报',
  '模板库、日程和 VP 计时',
]) {
  if (!html.includes(needle)) {
    throw new Error(`Official site is missing landing content: ${needle}`);
  }
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

const readme = readFileSync(readmePath, 'utf8');
for (const needle of ['界面预览', 'Competitive Companion', '下载最新版', '常见问题']) {
  if (!readme.includes(needle)) {
    throw new Error(`README is missing user-facing content: ${needle}`);
  }
}

const readmeReferences = [...readme.matchAll(/(?:href|src)="([^"]+)"/g)]
  .map(match => match[1])
  .filter(value => !value.startsWith('#') && !/^https?:/i.test(value));

for (const reference of readmeReferences) {
  const file = resolve(reference);
  if (!existsSync(file)) {
    throw new Error(`Broken local README reference: ${reference}`);
  }
}

console.log(
  `Official site and README check passed (${references.length + readmeReferences.length} local references).`,
);
