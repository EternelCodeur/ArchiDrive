import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();

const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  'vendor',
  'storage',
  'public',
  'dist',
  'build',
  'coverage',
  '.idea',
  '.vscode',
]);

const FRONTEND_ROOT = path.join(repoRoot, 'multi-share-vault');
const BACKEND_ROOT = path.join(repoRoot, 'backend');

const FRONTEND_SRC = path.join(FRONTEND_ROOT, 'src');
const BACKEND_APP = path.join(BACKEND_ROOT, 'app');
const BACKEND_ROUTES = path.join(BACKEND_ROOT, 'routes');
const BACKEND_CONFIG = path.join(BACKEND_ROOT, 'config');

const FRONTEND_DOCS = path.join(FRONTEND_ROOT, 'documentation');
const BACKEND_DOCS = path.join(BACKEND_ROOT, 'documentation');

const FRONTEND_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css']);
const BACKEND_EXTS = new Set(['.php']);

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function shouldExcludeDir(dirName) {
  return EXCLUDED_DIRS.has(dirName);
}

async function walkFiles(rootDir) {
  const out = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory()) {
        if (shouldExcludeDir(ent.name)) continue;
        await walk(path.join(current, ent.name));
      } else if (ent.isFile()) {
        out.push(path.join(current, ent.name));
      }
    }
  }
  if (await pathExists(rootDir)) {
    await walk(rootDir);
  }
  return out;
}

function extractImportsTS(source) {
  const internal = new Set();
  const external = new Set();

  // import ... from 'x'
  for (const m of source.matchAll(/\bimport\s+[^;\n]*?from\s+['\"]([^'\"]+)['\"]/g)) {
    const mod = m[1];
    if (mod.startsWith('.') || mod.startsWith('/')) internal.add(mod);
    else external.add(mod);
  }

  // require('x')
  for (const m of source.matchAll(/\brequire\(\s*['\"]([^'\"]+)['\"]\s*\)/g)) {
    const mod = m[1];
    if (mod.startsWith('.') || mod.startsWith('/')) internal.add(mod);
    else external.add(mod);
  }

  return {
    internal: [...internal].sort(),
    external: [...external].sort(),
  };
}

function extractPhpSymbols(source) {
  const namespace = (source.match(/^\s*namespace\s+([^;]+);/m) || [])[1] || '';
  const uses = [...source.matchAll(/^\s*use\s+([^;]+);/gm)].map((m) => m[1]).sort();
  const classes = [...source.matchAll(/^\s*(?:abstract\s+|final\s+)?class\s+(\w+)/gm)].map((m) => m[1]);
  const interfaces = [...source.matchAll(/^\s*interface\s+(\w+)/gm)].map((m) => m[1]);
  const traits = [...source.matchAll(/^\s*trait\s+(\w+)/gm)].map((m) => m[1]);
  const functions = [...source.matchAll(/^\s*(?:public|protected|private)?\s*function\s+(\w+)\s*\(/gm)].map((m) => m[1]);

  return {
    namespace,
    uses,
    types: [...new Set([...classes, ...interfaces, ...traits])].sort(),
    functions: [...new Set(functions)].sort(),
  };
}

function toDocPath({ docsRoot, sourceRoot, sourceFile }) {
  const rel = path.relative(sourceRoot, sourceFile);
  return path.join(docsRoot, rel + '.md');
}

function mdList(items) {
  if (!items || items.length === 0) return 'Aucun';
  return items.map((x) => `- \`${x}\``).join('\n');
}

async function writeDocFile(docPath, content) {
  await ensureDir(path.dirname(docPath));
  await fs.writeFile(docPath, content, 'utf8');
}

function buildFrontendDoc({ relSourcePath, imports }) {
  return `# ${relSourcePath}\n\n## Rôle\n\nÀ compléter.\n\n## Dépendances\n\n### Internes\n\n${mdList(imports.internal)}\n\n### Externes\n\n${mdList(imports.external)}\n\n## Comportement\n\nÀ compléter.\n\n## Points d’attention\n\nÀ compléter.\n`;
}

function buildBackendDoc({ relSourcePath, php }) {
  return `# ${relSourcePath}\n\n## Rôle\n\nÀ compléter.\n\n## Namespace\n\n${php.namespace ? `\`${php.namespace}\`` : 'Aucun'}\n\n## Types (class/interface/trait)\n\n${mdList(php.types)}\n\n## Méthodes / fonctions\n\n${mdList(php.functions)}\n\n## Imports (use)\n\n${mdList(php.uses)}\n\n## Comportement\n\nÀ compléter.\n\n## Endpoints / intégrations\n\nÀ compléter.\n`;
}

async function generateFrontendDocs() {
  const files = await walkFiles(FRONTEND_SRC);
  for (const f of files) {
    const ext = path.extname(f);
    if (!FRONTEND_EXTS.has(ext)) continue;

    const source = await fs.readFile(f, 'utf8');
    const imports = extractImportsTS(source);

    const relSourcePath = path.relative(FRONTEND_ROOT, f).replaceAll('\\', '/');
    const docPath = toDocPath({ docsRoot: FRONTEND_DOCS, sourceRoot: FRONTEND_ROOT, sourceFile: f });

    const md = buildFrontendDoc({ relSourcePath, imports });
    await writeDocFile(docPath, md);
  }
}

async function generateBackendDocsForRoot(sourceRoot, docsRoot, exts) {
  const files = await walkFiles(sourceRoot);
  for (const f of files) {
    const ext = path.extname(f);
    if (!exts.has(ext)) continue;

    const source = await fs.readFile(f, 'utf8');
    const php = extractPhpSymbols(source);

    const relSourcePath = path.relative(BACKEND_ROOT, f).replaceAll('\\', '/');
    const docPath = toDocPath({ docsRoot, sourceRoot: BACKEND_ROOT, sourceFile: f });

    const md = buildBackendDoc({ relSourcePath, php });
    await writeDocFile(docPath, md);
  }
}

async function main() {
  await ensureDir(FRONTEND_DOCS);
  await ensureDir(BACKEND_DOCS);

  await generateFrontendDocs();

  await generateBackendDocsForRoot(BACKEND_APP, BACKEND_DOCS, BACKEND_EXTS);
  await generateBackendDocsForRoot(BACKEND_ROUTES, BACKEND_DOCS, BACKEND_EXTS);
  await generateBackendDocsForRoot(BACKEND_CONFIG, BACKEND_DOCS, BACKEND_EXTS);

  // Ne pas écraser les README existants
  // Le script génère uniquement les docs "par fichier"

  console.log('Documentation générée avec succès.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
