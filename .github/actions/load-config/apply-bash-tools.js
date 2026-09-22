'use strict';

// Injects the configured shell allowlist into workflow frontmatter immediately
// before `gh aw compile` runs.
//
// Every agentic workflow ships with `bash: []` — deny by default. Some repos
// legitimately need a shell (a `test` prompt that should actually run
// `npm test`), but there was previously no supported way to grant one:
// hand-editing a workflow marks it drifted, so `gh factory upgrade` either
// refuses to run or silently reverts the edit. Imports cannot widen tools
// either — workflow frontmatter wins, and a `tools.bash` declared in
// Agentic workflow sources compile to zero shell entries by default.
//
// So the grant lives in factory.yml, the one file upgrade deliberately
// preserves, and is applied here at compile time. The .md sources stay
// verbatim on disk and their lock checksums stay honest.
//
// The allowlist is keyed by workflow, never global: arming `test` with
// `npm test` must not also hand a shell to `decompose`.

const fs = require('fs');
const path = require('path');

const FRONTMATTER_DELIM = '---';
const DENY_LINE = /^(\s*)bash:\s*\[\s*\]\s*$/;

function applyBashTools({ repoRoot = '.', config = {}, log = console.log } = {}) {
  const grants = (config.tools && config.tools.bash) || {};
  const workflows = Object.keys(grants).filter((name) => (grants[name] || []).length > 0);

  if (workflows.length === 0) {
    log('No tools.bash grants configured — every workflow keeps the deny-all default.');
    return { applied: [] };
  }

  const applied = [];
  for (const name of workflows) {
    const file = path.join(repoRoot, '.github', 'workflows', `${name}.md`);
    const commands = grants[name];

    // Read directly and interpret ENOENT, rather than calling existsSync first.
    // A check-then-use pair is a TOCTOU race — the file can change between the
    // two calls — and the read alone tells us everything the check would have.
    let original;
    try {
      original = fs.readFileSync(file, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(
          `factory.yml grants tools.bash to "${name}", but ${file} does not exist. ` +
            `Remove the grant or correct the workflow name.`
        );
      }
      throw err;
    }

    const lines = original.split('\n');

    // Confine the rewrite to the frontmatter. A `bash: []` appearing in the
    // prompt body is documentation, not configuration.
    const end = frontmatterEnd(lines, file);

    let replacedAt = -1;
    for (let i = 0; i < end; i++) {
      const match = DENY_LINE.exec(lines[i]);
      if (!match) continue;
      if (replacedAt !== -1) {
        throw new Error(`${file} has more than one \`bash: []\` line in its frontmatter.`);
      }
      lines[i] = `${match[1]}bash: ${JSON.stringify(commands)}`;
      replacedAt = i;
    }

    // Fail loudly rather than compiling a workflow that silently lacks the
    // shell its prompt was written to depend on.
    if (replacedAt === -1) {
      throw new Error(
        `${file} has no \`bash: []\` line in its frontmatter to widen. ` +
          `The workflow may already declare bash tools, or its frontmatter has changed shape.`
      );
    }

    fs.writeFileSync(file, lines.join('\n'));
    applied.push({ workflow: name, commands });
    log(`Granted ${name} shell access: ${commands.join(', ')}`);
  }

  return { applied };
}

function frontmatterEnd(lines, file) {
  if (lines[0].trim() !== FRONTMATTER_DELIM) {
    throw new Error(`${file} does not start with a YAML frontmatter block.`);
  }
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === FRONTMATTER_DELIM) return i;
  }
  throw new Error(`${file} has an unterminated YAML frontmatter block.`);
}

module.exports = { applyBashTools };
