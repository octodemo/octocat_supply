'use strict';

const { parseIssueMetadata } = require('./load-config');

/**
 * Filter sibling issues to the same scope as the closed issue.
 * When scope is null (no scopes configured), returns all siblings (backward compat).
 * @param {Array<{number: number, body: string}>} siblings - Sibling issues with body text
 * @param {string|null} closedScope - Scope of the closed issue
 * @returns {Array<{number: number, body: string, metadata: object}>} Filtered siblings with parsed metadata
 */
function filterSiblingsByScope(siblings, closedScope) {
  const results = [];
  for (const sibling of siblings) {
    const metadata = parseIssueMetadata(sibling.body);
    // No scope configured: include all siblings (backward compat)
    if (closedScope === null || closedScope === undefined) {
      results.push({ ...sibling, metadata });
    } else if (metadata.scope === closedScope) {
      results.push({ ...sibling, metadata });
    }
  }
  return results;
}

/**
 * Check if all dependencies (local + cross-scope) are satisfied.
 * @param {Array<{issue: string, scope: string|null}>} deps - Parsed depends_on list
 * @param {function} isIssueClosed - Async-compatible callback: (issueNumber) => boolean
 * @returns {{ satisfied: boolean, blocking: Array<{issue: string, scope: string|null}> }}
 */
function checkDependencies(deps, isIssueClosed) {
  const blocking = [];
  for (const dep of deps || []) {
    if (!isIssueClosed(dep.issue)) {
      blocking.push(dep);
    }
  }
  return { satisfied: blocking.length === 0, blocking };
}

/**
 * Format a narration message for cross-scope blocking dependencies.
 * @param {Array<{issue: string, scope: string|null}>} blocking - Blocking deps
 * @returns {string} Human-readable message
 */
function narrateCrossScopeBlocking(blocking) {
  if (!blocking || blocking.length === 0) return '';
  const lines = blocking.map(dep => {
    if (dep.scope) {
      return `- #${dep.issue} (scope: \`${dep.scope}\`)`;
    }
    return `- #${dep.issue}`;
  });
  return `⏸️ **Blocked by cross-scope dependencies:**\n${lines.join('\n')}`;
}

/**
 * Determine the concurrency group for advancement.
 * Includes scope when present for scope-aware parallelism.
 * @param {string} parent - Parent issue number
 * @param {string|null} scope - Scope name (null for unscoped repos)
 * @returns {string} Concurrency group key
 */
function advanceConcurrencyGroup(parent, scope) {
  if (scope) {
    return `factory-advance-${parent}-${scope}`;
  }
  return `factory-advance-${parent}`;
}

/**
 * Check if all scopes for a parent intent are complete.
 *
 * An empty result is deliberately *not* complete. `Array.every` on an empty
 * list is true, so a parent whose children could not be discovered — a query
 * that matched nothing, or a transient API failure returning an empty page —
 * would otherwise be declared finished and receive `factory:completed` before
 * any work happened.
 *
 * @param {Array<{number: number, body: string, state: string}>} allChildren - All child issues (open and closed)
 * @param {string} parent - Parent issue number
 * @returns {{ allComplete: boolean, scopeStatus: Object<string, {total: number, closed: number}> }}
 */
function checkAllScopesComplete(allChildren, parent) {
  const scopeStatus = {};

  for (const child of allChildren) {
    const metadata = parseIssueMetadata(child.body);
    // Only consider children of this parent
    if (metadata.parent !== parent) continue;

    const scope = metadata.scope || '_unscoped';
    if (!scopeStatus[scope]) {
      scopeStatus[scope] = { total: 0, closed: 0 };
    }
    scopeStatus[scope].total++;
    if (child.state === 'CLOSED' || child.state === 'closed') {
      scopeStatus[scope].closed++;
    }
  }

  const allComplete =
    Object.keys(scopeStatus).length > 0 &&
    Object.values(scopeStatus).every(s => s.total === s.closed);
  return { allComplete, scopeStatus };
}

/**
 * Find the next promotable sibling within a scope-filtered list.
 *
 * Selection is total and independent of input order: candidates are ranked by
 * `order` ascending, then by issue number ascending. The GitHub API does not
 * promise a stable listing order, so a comparator that keeps the first of two
 * equal orders would promote different issues on different runs from identical
 * repository state — the non-determinism this driver exists to remove.
 *
 * Dependencies that could not be parsed into an issue reference do not block.
 * Every child of the live intent #52 carried an unsubstituted
 * `depends_on: [<issue number of child 1>]`, and treating unreadable entries as
 * unsatisfied would deadlock that queue forever. They are returned in
 * `unresolvedInfo` so the condition is narrated rather than hidden.
 *
 * @param {Array<{number: number, metadata: object}>} scopedSiblings - Scope-filtered siblings
 * @param {function} isIssueClosed - (issueNumber) => boolean
 * @returns {{ next: object|null, blockingInfo: Array<{number: number, blocking: Array}>, unresolvedInfo: Array<{number: number, unresolved: string[]}> }}
 */
function findNextPromotable(scopedSiblings, isIssueClosed) {
  const blockingInfo = [];
  const unresolvedInfo = [];
  const ready = [];

  for (const sibling of scopedSiblings || []) {
    const metadata = sibling.metadata || {};
    const unresolved = metadata.unresolved_depends_on || [];
    if (unresolved.length > 0) {
      unresolvedInfo.push({ number: sibling.number, unresolved });
    }

    const { satisfied, blocking } = checkDependencies(metadata.depends_on, isIssueClosed);
    if (satisfied) {
      ready.push(sibling);
    } else {
      blockingInfo.push({ number: sibling.number, blocking });
    }
  }

  // An absent order sorts last rather than being discarded, so a sibling
  // without metadata is still promotable when it is the only candidate.
  const orderOf = sibling => {
    const parsed = parseInt(sibling.metadata && sibling.metadata.order, 10);
    return Number.isNaN(parsed) ? Infinity : parsed;
  };

  ready.sort((a, b) => orderOf(a) - orderOf(b) || Number(a.number) - Number(b.number));

  return { next: ready.length > 0 ? ready[0] : null, blockingInfo, unresolvedInfo };
}

module.exports = {
  filterSiblingsByScope,
  checkDependencies,
  narrateCrossScopeBlocking,
  advanceConcurrencyGroup,
  checkAllScopesComplete,
  findNextPromotable,
};
