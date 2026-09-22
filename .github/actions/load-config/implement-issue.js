'use strict';

// Factory — deterministic implement driver (#154).
//
// This replaces implement.md, which was already only a shim: it moved
// `factory:ready` to `factory:in-progress`, assigned the coding agent, and
// posted one comment. That is zero judgment and it cost 4-5 minutes of agent
// startup per sub-issue.
//
// advance-queue.js assigns the agent itself when it promotes, so on the normal
// path this driver finds the work already done and exits. It exists for the
// other promotion paths — promote-first-subissue.yml, decision-gate and
// decompose — which apply `factory:ready` without assigning anyone.

const fs = require('node:fs');

const { parseIssueMetadata } = require('./load-config');
const {
  gh,
  addLabel,
  removeLabel,
  comment,
  labelNames,
  isAssignedToAgent,
  assignCopilot,
} = require('./factory-github');

const REPO = process.env.GITHUB_REPOSITORY;

function noop(reason) {
  console.log(`Not implementing: ${reason}`);
  process.exit(0);
}

function main() {
  if (!REPO) throw new Error('GITHUB_REPOSITORY is not set');

  const issueNumber = process.env.FACTORY_ISSUE_NUMBER
    ? process.env.FACTORY_ISSUE_NUMBER.trim()
    : JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')).issue.number;

  if (!issueNumber) noop('no issue number was supplied');

  const issue = JSON.parse(
    gh([
      'issue', 'view', String(issueNumber), '--repo', REPO,
      '--json', 'number,title,body,state,labels,assignees',
    ])
  );

  // --- Guards ---------------------------------------------------------------
  if (String(issue.state).toUpperCase() !== 'OPEN') noop(`#${issueNumber} is not open`);

  const metadata = parseIssueMetadata(issue.body);
  if (!metadata.parent) noop(`#${issueNumber} is not a Factory child issue`);

  // The parent intent carries factory:decomposed, not factory:ready, but a
  // mislabelled parent would otherwise be handed to the coding agent as though
  // it were a slice of work.
  if (String(metadata.parent) === String(issueNumber)) noop('an issue cannot be its own parent');

  if (isAssignedToAgent(issue)) {
    noop(`#${issueNumber} is already assigned to the coding agent`);
  }

  const openPRs = gh(
    ['pr', 'list', '--repo', REPO, '--state', 'open', '--search', `${issueNumber} in:body`, '--json', 'number'],
    { allowFailure: true }
  );
  if (openPRs && JSON.parse(openPRs).length > 0) {
    noop(`#${issueNumber} already has an open pull request`);
  }

  // --- Assign ---------------------------------------------------------------
  //
  // Assignment happens before the label move. If it fails, the issue keeps
  // factory:ready and remains visibly queued rather than showing as work in
  // progress that nothing is actually working on.
  console.log(`Handing #${issueNumber} to the coding agent`);
  if (!assignCopilot(REPO, issueNumber)) {
    throw new Error(`could not assign the coding agent to #${issueNumber}`);
  }

  addLabel(REPO, issueNumber, 'factory:in-progress');
  if (labelNames(issue).includes('factory:ready')) {
    removeLabel(REPO, issueNumber, 'factory:ready');
  }

  comment(
    REPO,
    issueNumber,
    `🤖 This issue has been assigned to Copilot for implementation.\nDispatched by: \`${
      process.env.FACTORY_SOURCE || 'router'
    }\``
  );
}

// Only self-execute when run as a script, so the unit tests can require this
// module and assert its exports without shelling out to the GitHub API.
if (require.main === module) {
  main();
}

module.exports = { main };
