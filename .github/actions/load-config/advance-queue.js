'use strict';

// Factory — deterministic queue driver (#154).
//
// This replaces advance.md. Deciding which sibling runs next is a parser and a
// comparator: read a YAML block, check whether the issues it names are closed,
// take the lowest `order`, move labels, hand the issue to the coding agent.
// There is no judgment in it, and expressing it as a prompt meant the steps
// were requested rather than guaranteed — on 2026-07-28 the agent promoting #54
// added `factory:ready` and skipped removing `factory:blocked`, leaving the
// issue in a contradictory state that a backstop had to repair.
//
// Decompose, review, test, research, ci-repair and decision-gate remain
// agentic. Those involve genuine judgment. This is only the state machine.

const fs = require('node:fs');

const { loadConfig, parseIssueMetadata } = require('./load-config');
const {
  filterSiblingsByScope,
  findNextPromotable,
  checkAllScopesComplete,
  narrateCrossScopeBlocking,
} = require('./scope-advance');
const {
  gh,
  addLabel,
  removeLabel,
  comment,
  labelNames,
  assignCopilot,
} = require('./factory-github');

const REPO = process.env.GITHUB_REPOSITORY;

// Explicit because `gh issue list` defaults to 30. On a busy repository that
// silently truncates, and a truncated child set reads as "everything is
// closed" — which would complete an intent whose work is still running.
const ISSUE_LIST_LIMIT = 500;

const LIFECYCLE_IN_FLIGHT = ['factory:in-progress', 'factory:review', 'factory:merging'];
const LIFECYCLE_QUEUED = [
  ...LIFECYCLE_IN_FLIGHT,
  'factory:ready',
  'factory:blocked',
  'factory:done',
];
const LIFECYCLE_CLEAR_ON_CLOSE = [...LIFECYCLE_IN_FLIGHT, 'factory:blocked'];

function wasQueued(labels) {
  return labels.some(label => LIFECYCLE_QUEUED.includes(label));
}

function labelsToClearOnClose(labels) {
  return LIFECYCLE_CLEAR_ON_CLOSE.filter(label => labels.includes(label));
}

function eventPath(env = process.env) {
  return env.FACTORY_EVENT_PATH || env.GITHUB_EVENT_PATH;
}

/** Stop without failing. Declining to advance is a normal outcome, not an error. */
function noop(reason) {
  console.log(`No advancement: ${reason}`);
  process.exit(0);
}

function main() {
  if (!REPO) throw new Error('GITHUB_REPOSITORY is not set');

  const event = JSON.parse(fs.readFileSync(eventPath(), 'utf8'));
  const closed = event.issue;
  if (!closed) noop('the event carried no issue');

  // --- Guards ---------------------------------------------------------------
  if (String(closed.state).toLowerCase() !== 'closed') noop(`#${closed.number} is not closed`);

  const closedMeta = parseIssueMetadata(closed.body);
  if (!closedMeta.parent) noop(`#${closed.number} has no factory parent metadata`);
  if (String(closedMeta.parent) === String(closed.number)) noop('an issue cannot be its own parent');

  const closedLabels = labelNames(closed);
  if (!wasQueued(closedLabels)) {
    noop(`#${closed.number} was never in the queue (labels: ${closedLabels.join(', ') || 'none'})`);
  }

  const parent = String(closedMeta.parent);
  const scope = closedMeta.scope;
  console.log(`#${closed.number} closed — parent #${parent}${scope ? `, scope ${scope}` : ''}`);

  const { config, warnings } = loadConfig({ repoRoot: process.env.GITHUB_WORKSPACE || '.' });
  for (const w of warnings) console.log(`::warning::${w}`);

  const narrationEnabled = Boolean(config.features.narration.enabled);
  const requireApproval = Boolean(config.approval.implementation.require_approval);

  // --- Step 1: normalize the closed child ----------------------------------
  console.log('Normalizing the closed child');
  addLabel(REPO, closed.number, 'factory:done');
  for (const label of labelsToClearOnClose(closedLabels)) {
    removeLabel(REPO, closed.number, label);
  }
  if (narrationEnabled) {
    comment(REPO, closed.number, '✅ Done — merged and closed. Advancing the queue...');
  }

  // --- Step 2: build the sibling set ---------------------------------------
  const allIssues = JSON.parse(
    gh([
      'issue', 'list', '--repo', REPO,
      '--state', 'all',
      '--limit', String(ISSUE_LIST_LIMIT),
      '--json', 'number,title,body,state,labels',
    ])
  );

  const closedByNumber = new Map(
    allIssues.map(i => [String(i.number), String(i.state).toUpperCase() === 'CLOSED'])
  );
  const isIssueClosed = n => closedByNumber.get(String(n)) === true;

  const children = allIssues
    .filter(i => String(i.number) !== parent)
    .map(i => ({ ...i, metadata: parseIssueMetadata(i.body) }))
    .filter(i => String(i.metadata.parent) === parent);

  console.log(`Found ${children.length} children of #${parent}`);

  // --- Step 3: completion ---------------------------------------------------
  //
  // Checked before promotion because it takes precedence: with every child
  // closed there is nothing to promote and nothing to wait for.
  //
  // `factory:completed` is deliberately NOT applied here. factory-complete.yml
  // already owns that transition and also normalizes any child left carrying an
  // in-flight label (#144). Writing it from two workflows would race them to
  // the same terminal state.
  const { allComplete, scopeStatus } = checkAllScopesComplete(children, parent);
  console.log(`Scope status: ${JSON.stringify(scopeStatus)}`);

  if (allComplete) {
    console.log('Every child is closed — the intent is complete');
    if (narrationEnabled) {
      comment(
        REPO,
        parent,
        [
          '🎉 **All sub-issues are complete.**',
          '',
          'Every slice has been implemented, merged, and closed across all scopes. The intent is ready for human review.',
          '',
          '| Detail | Value |',
          '| --- | --- |',
          `| Total sub-issues | ${children.length} |`,
          `| Last completed | #${closed.number} |`,
          `| Last scope | ${scope || '`unscoped`'} |`,
          `| Finished | ${new Date().toISOString()} |`,
        ].join('\n')
      );
    }
    return;
  }

  // --- Step 4: choose the next sibling -------------------------------------
  const openSiblings = children.filter(
    c => String(c.state).toUpperCase() === 'OPEN' && String(c.number) !== String(closed.number)
  );

  // Idempotency: a sibling already carrying factory:ready or
  // factory:in-progress was promoted by an earlier run, so this closure has
  // nothing left to do.
  const alreadyPromoted = openSiblings.filter(c =>
    labelNames(c).some(l => l === 'factory:ready' || l === 'factory:in-progress')
  );
  if (alreadyPromoted.length > 0) {
    console.log(`Queue is already advancing: ${alreadyPromoted.map(c => `#${c.number}`).join(', ')}`);
    return;
  }

  const scoped = filterSiblingsByScope(openSiblings, scope);
  const { next, blockingInfo, unresolvedInfo } = findNextPromotable(scoped, isIssueClosed);

  for (const entry of unresolvedInfo) {
    console.log(
      `::warning::#${entry.number} has unresolvable depends_on entries ` +
        `(${entry.unresolved.join(', ')}); sequencing falls back to \`order\``
    );
  }

  const progress = `(${closedMeta.order || '?'}/${closedMeta.total || children.length})`;
  const scopeNote = scope ? ` [scope: \`${scope}\`]` : '';

  if (!next) {
    console.log('No sibling is ready — waiting');
    if (narrationEnabled) {
      const lines = [
        `✅ #${closed.number} complete ${progress}${scopeNote}. Remaining siblings still have unmet dependencies — waiting.`,
      ];
      const crossScope = blockingInfo.flatMap(b => b.blocking.filter(d => d.scope));
      if (crossScope.length > 0) {
        lines.push('', '⏸️ **Cross-scope blockers**', narrateCrossScopeBlocking(crossScope));
      }
      comment(REPO, parent, lines.join('\n'));
    }
    return;
  }

  // --- Step 5: approval gate ------------------------------------------------
  if (requireApproval) {
    console.log(`Implementation approval required — not promoting #${next.number}`);
    addLabel(REPO, parent, 'factory:needs-human');
    comment(
      REPO,
      parent,
      [
        '⏸️ **Implementation approval required**',
        '',
        `#${closed.number} is complete ${progress}${scopeNote}.`,
        `Next up is #${next.number}${next.title ? ` (${next.title})` : ''}.`,
        '',
        'Review the completed work, then apply `factory:resume` to approve advancing.',
      ].join('\n')
    );
    return;
  }

  // --- Step 6: promote ------------------------------------------------------
  //
  // Labels are state and UI only; assignment is the execution signal. Assign
  // first: a failure must fail the run rather than leave an issue labelled as
  // work in progress that nothing is working on. A silent stall is the worst
  // outcome for an autonomous pipeline, because it looks identical to work
  // actually being done.
  console.log(`Promoting #${next.number}`);
  if (!assignCopilot(REPO, next.number)) {
    throw new Error(`could not assign the coding agent to #${next.number}`);
  }

  // Straight to factory:in-progress. The agent is already assigned, so routing
  // through factory:ready would only make the router dispatch implement.yml to
  // discover there is nothing left to do — the 4-5 minutes per sub-issue this
  // change exists to remove.
  addLabel(REPO, next.number, 'factory:in-progress');
  removeLabel(REPO, next.number, 'factory:blocked');
  removeLabel(REPO, next.number, 'factory:ready');

  if (narrationEnabled) {
    comment(
      REPO,
      parent,
      [
        `✅ #${closed.number} complete ${progress}${scopeNote}.`,
        `⏭️ Promoting #${next.number}${next.title ? ` (${next.title})` : ''} — assigned to the coding agent.`,
      ].join('\n')
    );
  }

  // --- Step 7: cross-scope sync --------------------------------------------
  if (scope) {
    const dependents = children.filter(
      c =>
        String(c.state).toUpperCase() === 'OPEN' &&
        c.metadata.scope &&
        c.metadata.scope !== scope &&
        c.metadata.depends_on.some(d => String(d.issue) === String(closed.number))
    );
    if (dependents.length > 0) {
      console.log('Closure unblocks another scope — dispatching cross-scope-sync');
      gh(
        [
          'workflow', 'run', 'cross-scope-sync.lock.yml', '--repo', REPO,
          '-f', `closed_issue_number=${closed.number}`,
          '-f', `parent_issue_number=${parent}`,
          '-f', `closed_scope=${scope}`,
          '-f', 'source=advance',
        ],
        { allowFailure: true }
      );
    }
  }
}

// Only self-execute when run as a script, so the unit tests can require this
// module and assert its exports without shelling out to the GitHub API.
if (require.main === module) {
  main();
}

module.exports = { main, wasQueued, labelsToClearOnClose, eventPath };
