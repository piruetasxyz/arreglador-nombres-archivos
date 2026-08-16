const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

const IGNORED_DIR_NAMES = new Set(['node_modules']);

const CONVENTIONAL_NAMES = new Set([
  'readme', 'readme.md', 'readme.txt',
  'license', 'license.md', 'license.txt',
  'changelog', 'changelog.md',
  'contributing', 'contributing.md',
  'code_of_conduct.md',
  'security.md',
  'authors', 'authors.md',
  'notice', 'notice.md',
]);

function isIgnored(name) {
  return name.startsWith('.') || IGNORED_DIR_NAMES.has(name);
}

function walk(dir, fileList = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (isIgnored(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, fileList);
    } else if (entry.isFile()) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function slugify(str) {
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeName(filename) {
  if (CONVENTIONAL_NAMES.has(filename.toLowerCase())) return filename;

  const ext = path.extname(filename);
  const base = ext ? filename.slice(0, -ext.length) : filename;
  const fixedBase = slugify(base) || 'archivo';
  const fixedExt = ext ? '.' + slugify(ext.slice(1)) : '';
  return fixedBase + fixedExt;
}

function planRenames(rootDir) {
  const files = walk(rootDir);
  const byDir = new Map();

  for (const filePath of files) {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(base);
  }

  const changes = [];
  const conflicts = [];

  for (const [dir, bases] of byDir) {
    const stationary = new Set();
    const moves = [];

    for (const base of bases) {
      const fixed = normalizeName(base);
      if (fixed === base) {
        stationary.add(base);
      } else {
        moves.push({ base, fixed });
      }
    }

    const targetCounts = new Map();
    for (const { fixed } of moves) {
      targetCounts.set(fixed, (targetCounts.get(fixed) || 0) + 1);
    }

    for (const { base, fixed } of moves) {
      const entry = {
        before: path.relative(rootDir, path.join(dir, base)),
        after: path.relative(rootDir, path.join(dir, fixed)),
        dir,
        base,
        fixed,
      };

      if (targetCounts.get(fixed) > 1 || stationary.has(fixed)) {
        conflicts.push(entry);
      } else {
        changes.push(entry);
      }
    }
  }

  return { changes, conflicts };
}

function writeReport(reportPath, changes, conflicts, applied) {
  const lines = ['### 🔧 Archivos renombrados', ''];

  if (changes.length > 0) {
    for (const { before, after } of changes) {
      const suffix = applied ? '' : ' _(pendiente, ejecuta con `arreglar: true`)_';
      lines.push(`- \`${before}\` → \`${after}\`${suffix}`);
    }
  } else {
    lines.push('_Sin cambios._');
  }

  if (conflicts.length > 0) {
    lines.push('', '#### ⚠️ Conflictos (no renombrados)', '');
    for (const { before, after } of conflicts) {
      lines.push(`- \`${before}\` → \`${after}\``);
    }
  }

  fs.writeFileSync(reportPath, lines.join('\n') + '\n');
}

try {
  const start = Date.now();
  const shouldFix = core.getBooleanInput('arreglar');
  const rootDir = process.cwd();

  const { changes, conflicts } = planRenames(rootDir);

  if (shouldFix) {
    for (const { dir, base, fixed } of changes) {
      fs.renameSync(path.join(dir, base), path.join(dir, fixed));
    }
  }

  for (const { before, after } of changes) {
    core.info(`${before} -> ${after}`);
  }
  for (const { before, after } of conflicts) {
    core.warning(`conflicto: ${before} -> ${after}`);
  }

  const hayCambios = changes.length > 0;
  core.setOutput('hay_cambios', hayCambios ? 'true' : 'false');

  if (hayCambios || conflicts.length > 0) {
    writeReport(path.join(rootDir, 'cambios.txt'), changes, conflicts, shouldFix);
  }

  core.setOutput('time', `${Date.now() - start}ms`);
} catch (error) {
  core.setFailed(error.message);
}
