#!/usr/bin/env node
// Copies the shipped data + brand assets into the app's public folder.
// Wired as prestart/prebuild in app/package.json — data/ stays the single source of truth.
const fs = require('fs');
const path = require('path');

const repo = path.join(__dirname, '..', '..');
const pub = path.join(repo, 'app', 'public');

const jobs = [
  [path.join(repo, 'data', 'rarau.json'), path.join(pub, 'data', 'rarau.json')],
  [path.join(repo, 'docs', 'logo-prietenii-muntelui.jpg'), path.join(pub, 'logo.jpg')]
];

for (const [src, dst] of jobs) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log(`synced ${path.relative(repo, src)} -> ${path.relative(repo, dst)}`);
}
