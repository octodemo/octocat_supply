'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function checksum(content) {
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

function normalizeCompilerVersion(version) {
  const fields = String(version || '').trim().split(/\s+/);
  const value = fields.at(-1) || '';
  return value ? `v${value.replace(/^v/, '')}` : '';
}

function recordCompiledLocks({ repoRoot = process.cwd(), compilerVersion } = {}) {
  const lockPath = path.join(repoRoot, '.github', 'factory.lock');
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  lock.files ||= {};
  const supportedVersion = fs.readFileSync(
    path.join(repoRoot, '.github', 'config', 'gh-aw-version.txt'),
    'utf8',
  ).trim();
  const actualVersion = normalizeCompilerVersion(compilerVersion);
  if (actualVersion !== supportedVersion) {
    throw new Error(`gh-aw compiler ${actualVersion || '(unknown)'} is unsupported; Factory requires ${supportedVersion}`);
  }

  const managedSources = new Set(
    Object.entries(lock.files)
      .filter(([filePath, entry]) => entry.source === 'template' && filePath.endsWith('.md'))
      .map(([filePath]) => filePath),
  );
  const managedLocks = new Set(
    [...managedSources].map((filePath) => filePath.replace(/\.md$/, '.lock.yml')),
  );

  for (const [filePath, entry] of Object.entries(lock.files)) {
    if (entry.source === 'compiled' && !managedLocks.has(filePath)) {
      delete lock.files[filePath];
    }
  }

  const actual = [];
  for (const sourcePath of managedSources) {
    const filePath = sourcePath.replace(/\.md$/, '.lock.yml');
    if (!fs.existsSync(path.join(repoRoot, filePath))) {
      throw new Error(`managed compiled workflow ${filePath} is missing`);
    }
    const source = fs.readFileSync(path.join(repoRoot, sourcePath));
    if (checksum(source) !== lock.files[sourcePath].checksum) {
      throw new Error(`managed workflow source ${sourcePath} has drifted`);
    }
    const content = fs.readFileSync(path.join(repoRoot, filePath));
    lock.files[filePath] = {
      checksum: checksum(content),
      source: 'compiled',
      source_path: sourcePath,
      source_checksum: checksum(source),
      compiler_version: supportedVersion,
    };
    actual.push(filePath);
  }

  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  return actual.sort();
}

module.exports = { checksum, normalizeCompilerVersion, recordCompiledLocks };
