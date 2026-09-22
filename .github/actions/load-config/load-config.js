'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Ajv = require('ajv');

const DEFAULTS = {
  version: 1,
  labels: { prefix: 'factory' },
  branches: { pattern: 'factory/issue-{number}' },
  features: {
    narration: { enabled: true, style: 'append' },
    emojis: { enabled: true },
    screenshots: { enabled: false },
  },
  merge: {
    enabled: true,
    method: 'squash',
    require_human_review: false,
    auto_merge_on_green: false,
    delete_branch: true,
  },
  approval: {
    implementation: { require_approval: false },
    plan: { require_approval: false },
  },
  ci_repair: {
    max_attempts: 2,
    escalation: { after_attempts: 2, action: 'label', label: 'factory:needs-human' },
  },
  context: { files: [], instructions: '' },
  tools: { bash: {} },
  hooks: { pre_merge: { enabled: false, command: '', timeout: 120 } },
  scopes: [],
};

const REMOVED_CONFIG_KEYS = ['coordination', 'multi_repo', 'squad'];

function validateConfigWarnings(userConfig) {
  const warnings = [];
  const hasOwn = Object.prototype.hasOwnProperty;

  for (const key of REMOVED_CONFIG_KEYS) {
    if (hasOwn.call(userConfig, key)) {
      warnings.push(`Schema warning: legacy factory.${key} is no longer supported — remove it`);
    }
  }

  return warnings;
}

/**
 * Deep merge source into target (target values win where defined).
 */
function deepMerge(target, source) {
  const result = { ...source };
  for (const key of Object.keys(target)) {
    if (
      target[key] !== null &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key]) &&
      typeof source[key] === 'object' &&
      source[key] !== null &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = target[key];
    }
  }
  return result;
}

/**
 * Load and validate factory configuration.
 * @param {object} options
 * @param {string} [options.repoRoot] - Path to the repo root (defaults to process.cwd())
 * @param {string} [options.configPath] - Explicit path to factory.yml
 * @param {string} [options.schemaPath] - Explicit path to factory.schema.json
 * @returns {{ config: object, warnings: string[] }}
 */
function loadConfig(options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const configPath = options.configPath || path.join(repoRoot, '.github', 'factory.yml');
  const schemaPath = options.schemaPath || path.join(repoRoot, '.github', 'factory.schema.json');

  const warnings = [];
  let rawConfig = null;

  // Read config file (fall back to defaults if missing)
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    rawConfig = yaml.load(content);
  } else {
    warnings.push('factory.yml not found — using defaults');
  }

  // Extract factory key
  const userConfig = rawConfig && rawConfig.factory ? rawConfig.factory : {};
  const activeConfig = { ...userConfig };
  for (const key of REMOVED_CONFIG_KEYS) {
    delete activeConfig[key];
  }

  // Merge with defaults
  const config = deepMerge(activeConfig, DEFAULTS);

  warnings.push(...validateConfigWarnings(userConfig));

  // Validate against schema if available
  if (fs.existsSync(schemaPath)) {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);
    const valid = validate({ factory: config });
    if (!valid && validate.errors) {
      for (const err of validate.errors) {
        warnings.push(`Schema warning: ${err.instancePath} ${err.message}`);
      }
    }
  }

  return { config, warnings };
}

/**
 * Flatten config into action outputs format.
 */
function configToOutputs(config) {
  return {
    'labels-prefix': config.labels.prefix,
    'branch-pattern': config.branches.pattern,
    'merge-enabled': String(config.merge.enabled),
    'merge-method': config.merge.method,
    'merge-require-human-review': String(config.merge.require_human_review),
    'merge-delete-branch': String(config.merge.delete_branch),
    'merge-auto-on-green': String(config.merge.auto_merge_on_green),
    'ci-repair-max-attempts': String(config.ci_repair.max_attempts),
    'ci-repair-escalation-label': config.ci_repair.escalation.label,
    'narration-enabled': String(config.features.narration.enabled),
    'emojis-enabled': String(config.features.emojis.enabled),
    'approval-implementation': String(config.approval.implementation.require_approval),
    'approval-plan': String(config.approval.plan.require_approval),
    'hook-pre-merge-enabled': String(config.hooks.pre_merge.enabled),
    'hook-pre-merge-command': config.hooks.pre_merge.command,
    'hook-pre-merge-timeout': String(config.hooks.pre_merge.timeout),
    'context-files': (config.context.files || []).join(','),
    'context-instructions': config.context.instructions || '',
    'scopes-json': JSON.stringify(config.scopes || []),
  };
}

/**
 * Read a scalar `key: value` from a factory metadata block.
 *
 * Anchored to the start of a line so that a longer key ending in the one we
 * want cannot satisfy the match — `grandparent: 99` used to be read as
 * `parent: 99`, silently reparenting a child onto the wrong intent.
 *
 * @param {string} block - The factory YAML block text
 * @param {string} key - Field name
 * @returns {string|null} Trimmed value, or null when absent or empty
 */
function readScalarField(block, key) {
  const re = new RegExp(`^[ \\t]*${key}:[ \\t]*(.*)$`, 'm');
  const match = block.match(re);
  if (!match) return null;
  const value = match[1].trim();
  if (!value) return null;
  return value;
}

/**
 * Convert one `depends_on` entry into a dependency reference.
 * Accepts `123`, `#123` and the extended cross-scope form `123:infra`.
 * @param {string} raw - A single entry, already stripped of list punctuation
 * @returns {{issue: string, scope: string|null}|null} null when unresolvable
 */
function parseDependencyEntry(raw) {
  const trimmed = raw.replace(/["']/g, '').trim();
  if (!trimmed) return null;

  const extMatch = trimmed.match(/^#?(\d+):(\S+)$/);
  if (extMatch) return { issue: extMatch[1], scope: extMatch[2] };

  const plainMatch = trimmed.match(/^#?(\d+)$/);
  if (plainMatch) return { issue: plainMatch[1], scope: null };

  return null;
}

/**
 * Parse a `depends_on` value in either YAML sequence style.
 *
 * decompose.md emits the inline flow form (`depends_on: [12, 13]`) and every
 * child issue in production uses it, but only the block form was ever parsed.
 * Inline lists therefore came back empty, which reads identically to "this
 * child has no dependencies" — dependency ordering was silently inert.
 *
 * Entries that are not issue references (most commonly an unsubstituted
 * `<issue number of child 1>` placeholder) are reported separately rather than
 * dropped, so a caller can tell "no dependencies" apart from "dependencies I
 * could not resolve" and refuse to guess.
 *
 * @param {string} block - The factory YAML block text
 * @returns {{deps: Array<{issue: string, scope: string|null}>, unresolved: string[]}}
 */
function parseDependsOn(block) {
  const deps = [];
  const unresolved = [];

  const collect = raw => {
    const parsed = parseDependencyEntry(raw);
    if (parsed) {
      deps.push(parsed);
    } else if (raw.trim()) {
      unresolved.push(raw.trim());
    }
  };

  // Inline flow sequence: depends_on: [12, 13:infra]
  const inlineMatch = block.match(/^[ \t]*depends_on:[ \t]*\[([^\]]*)\][ \t]*$/m);
  if (inlineMatch) {
    for (const entry of inlineMatch[1].split(',')) collect(entry);
    return { deps, unresolved };
  }

  // Block sequence:
  //   depends_on:
  //     - 12
  const blockMatch = block.match(/^[ \t]*depends_on:[ \t]*\n((?:[ \t]*-[^\n]*\n?)*)/m);
  if (blockMatch) {
    for (const line of blockMatch[1].split('\n')) {
      if (!line.trim()) continue;
      collect(line.replace(/^[\s-]+/, ''));
    }
  }

  return { deps, unresolved };
}

/**
 * Parse sub-issue YAML metadata from an issue body.
 * Looks for a fenced YAML block with factory lineage metadata.
 * Supports `scope` field and extended `depends_on` syntax like "300:infra".
 * @param {string} body - Issue body text
 * @returns {{ parent: string|null, order: string|null, total: string|null, scope: string|null, depends_on: Array<{issue: string, scope: string|null}>, unresolved_depends_on: string[] }}
 */
function parseIssueMetadata(body) {
  const result = {
    parent: null,
    order: null,
    total: null,
    scope: null,
    depends_on: [],
    unresolved_depends_on: [],
  };
  if (!body) return result;

  // Match fenced YAML blocks containing factory metadata
  const fenceRegex = /```ya?ml\s*\n([\s\S]*?)```/g;
  let match;
  let factoryBlock = null;

  while ((match = fenceRegex.exec(body)) !== null) {
    if (match[1].includes('factory:') || match[1].includes('parent:')) {
      factoryBlock = match[1];
      break;
    }
  }

  // Fallback: try inline factory: block (no fences)
  if (!factoryBlock) {
    const inlineMatch = body.match(/factory:\s*\n((?:[ \t]+\S.*\n?)*)/);
    if (inlineMatch) {
      factoryBlock = 'factory:\n' + inlineMatch[1];
    }
  }

  if (!factoryBlock) return result;

  // Parse fields from the YAML block
  const parent = readScalarField(factoryBlock, 'parent');
  if (parent) {
    const parentMatch = parent.match(/^#?(\d+)/);
    if (parentMatch) result.parent = parentMatch[1];
  }

  const order = readScalarField(factoryBlock, 'order');
  if (order && /^\d+$/.test(order)) result.order = order;

  const total = readScalarField(factoryBlock, 'total');
  if (total && /^\d+$/.test(total)) result.total = total;

  // An absent, empty or explicitly null scope all mean "unscoped". Reading the
  // literal string "null" as a scope name would make the issue belong to a
  // scope that does not exist, excluding it from every sibling set.
  const scope = readScalarField(factoryBlock, 'scope');
  if (scope && scope !== 'null' && scope !== '~') {
    result.scope = scope.split(/\s+/)[0];
  }

  const { deps, unresolved } = parseDependsOn(factoryBlock);
  result.depends_on = deps;
  result.unresolved_depends_on = unresolved;

  return result;
}

/**
 * Validate that a scope referenced in metadata matches a declared scope in config.
 * @param {string|null} scope - Scope name from issue metadata
 * @param {Array} declaredScopes - Scopes array from factory config
 * @returns {string[]} Array of warning messages (empty if valid)
 */
function validateScope(scope, declaredScopes) {
  const warnings = [];
  if (!scope) return warnings;
  if (!declaredScopes || declaredScopes.length === 0) return warnings;

  const names = declaredScopes.map(s => s.name);
  if (!names.includes(scope)) {
    warnings.push(`Scope "${scope}" is not declared in factory.yml scopes: [${names.join(', ')}]`);
  }
  return warnings;
}

module.exports = { loadConfig, configToOutputs, parseIssueMetadata, validateScope, DEFAULTS, deepMerge };
