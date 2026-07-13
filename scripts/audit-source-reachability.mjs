import { parse } from '@babel/parser';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const TESTS = path.join(ROOT, 'tests');
const SCRIPTS = path.join(ROOT, 'scripts');
const ROOTS = [path.join(SRC, 'main.jsx')];
const SOURCE_EXTENSIONS = ['.js', '.jsx', '.mjs'];

function listSourceFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(absolute));
    else if (SOURCE_EXTENSIONS.includes(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

function visit(node, callback) {
  if (!node || typeof node !== 'object') return;
  callback(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => visit(child, callback));
    else if (value && typeof value === 'object' && typeof value.type === 'string') visit(value, callback);
  }
}

function importSpecifiers(file) {
  const code = readFileSync(file, 'utf8');
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'dynamicImport', 'importAttributes'],
  });
  const specifiers = new Set();
  visit(ast, (node) => {
    if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) && node.source?.value) {
      specifiers.add(node.source.value);
    }
    if (node.type === 'CallExpression' && node.callee?.type === 'Import' && node.arguments?.[0]?.value) {
      specifiers.add(node.arguments[0].value);
    }
    if (node.type === 'ImportExpression' && node.source?.value) specifiers.add(node.source.value);
  });
  return [...specifiers];
}

function resolveLocalImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => path.join(base, `index${extension}`)),
  ];
  return candidates.find((candidate) => existsSync(candidate) && SOURCE_EXTENSIONS.includes(path.extname(candidate))) || null;
}

const allFiles = listSourceFiles(SRC);
const allSet = new Set(allFiles);
const unresolved = [];

function traceReachable(roots, trackUnresolved = false) {
  const reached = new Set();
  const queue = roots.filter((file) => allSet.has(file));
  while (queue.length) {
    const file = queue.shift();
    if (reached.has(file)) continue;
    reached.add(file);
    for (const specifier of importSpecifiers(file)) {
      if (!specifier.startsWith('.')) continue;
      const extension = path.extname(specifier);
      if (extension && !SOURCE_EXTENSIONS.includes(extension)) continue;
      const resolved = resolveLocalImport(file, specifier);
      if (!resolved) {
        if (trackUnresolved) unresolved.push({ file: path.relative(ROOT, file), specifier });
        continue;
      }
      if (!reached.has(resolved)) queue.push(resolved);
    }
  }
  return reached;
}

function supportRoots(directory) {
  if (!existsSync(directory)) return [];
  const roots = new Set();
  for (const file of listSourceFiles(directory)) {
    for (const specifier of importSpecifiers(file)) {
      const resolved = resolveLocalImport(file, specifier);
      if (resolved && allSet.has(resolved)) roots.add(resolved);
    }
  }
  return [...roots];
}

const reachable = traceReachable(ROOTS, true);
const supportReachable = traceReachable([
  ...supportRoots(TESTS),
  ...supportRoots(SCRIPTS),
  path.join(SRC, 'server/horizonAgent.js'),
]);
const unreachable = allFiles
  .filter((file) => !reachable.has(file))
  .map((file) => path.relative(ROOT, file))
  .sort();
const supportOnly = allFiles
  .filter((file) => !reachable.has(file) && supportReachable.has(file))
  .map((file) => path.relative(ROOT, file))
  .sort();
const orphaned = allFiles
  .filter((file) => !reachable.has(file) && !supportReachable.has(file))
  .map((file) => path.relative(ROOT, file))
  .sort();
const supportOnlyComponents = supportOnly.filter((file) => file.endsWith('.jsx'));

const result = {
  roots: ROOTS.map((file) => path.relative(ROOT, file)),
  sourceFiles: allFiles.length,
  reachableFiles: reachable.size,
  unreachableFiles: unreachable.length,
  supportOnlyFiles: supportOnly.length,
  supportOnlyComponents: supportOnlyComponents.length,
  orphanedFiles: orphaned.length,
  unresolvedImports: unresolved.length,
  reachable: [...reachable].map((file) => path.relative(ROOT, file)).sort(),
  unreachable,
  supportOnly,
  supportOnlyComponentPaths: supportOnlyComponents,
  orphaned,
  unresolved,
};

if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
else {
  console.log(`Source files: ${result.sourceFiles}`);
  console.log(`Reachable: ${result.reachableFiles}`);
  console.log(`Support only: ${result.supportOnlyFiles}`);
  console.log(`Support-only JSX components: ${result.supportOnlyComponents}`);
  console.log(`Orphaned: ${result.orphanedFiles}`);
  console.log(`Unresolved imports: ${result.unresolvedImports}`);
  orphaned.forEach((file) => console.log(file));
  supportOnlyComponents.forEach((file) => console.log(`UNUSED_COMPONENT ${file}`));
  unresolved.forEach(({ file, specifier }) => console.log(`UNRESOLVED ${file} -> ${specifier}`));
}

if (unresolved.length || orphaned.length || supportOnlyComponents.length) process.exitCode = 1;
