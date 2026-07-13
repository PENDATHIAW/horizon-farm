import { spawn } from 'node:child_process';
import { cpus } from 'node:os';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const TEST_DIR = join(ROOT, 'tests/unit');
const VITE_NODE = join(ROOT, 'node_modules/.bin/vite-node');
const files = readdirSync(TEST_DIR)
  .filter((file) => file.endsWith('.test.js'))
  .sort()
  .map((file) => `tests/unit/${file}`);
const workerCount = Math.max(1, Math.min(Number(process.env.UNIT_TEST_WORKERS) || 6, cpus().length, files.length));

let cursor = 0;
let completed = 0;
let passed = 0;
const failures = [];

function runFile(file) {
  return new Promise((resolve) => {
    const child = spawn(VITE_NODE, [file], {
      cwd: ROOT,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NODE_NO_WARNINGS: process.env.NODE_NO_WARNINGS || '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('error', (error) => resolve({ code: 1, output: `${error.stack || error}` }));
    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });
}

async function worker() {
  while (cursor < files.length) {
    const index = cursor;
    cursor += 1;
    const file = files[index];
    const result = await runFile(file);
    completed += 1;
    if (result.code === 0) passed += 1;
    else failures.push({ file, output: result.output });
    if (completed % 20 === 0 || completed === files.length) {
      console.log(`Tests unitaires: ${completed}/${files.length}`);
    }
  }
}

await Promise.all(Array.from({ length: workerCount }, () => worker()));

for (const failure of failures) {
  console.error(`\nECHEC ${failure.file}\n${failure.output.trim()}\n`);
}

console.log(`Resultat: ${passed}/${files.length} fichiers valides, ${failures.length} en echec.`);
if (failures.length) process.exitCode = 1;
