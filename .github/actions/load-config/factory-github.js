'use strict';

// Shared GitHub operations for the deterministic Factory drivers (#154).
//
// advance-queue.js and implement-issue.js both move lifecycle labels and hand
// issues to the coding agent. Keeping those operations in one module means the
// two entry points cannot drift into disagreeing about what promotion means.

const { execFileSync } = require('node:child_process');

/** The coding agent's login as GitHub reports it from suggestedActors. */
const AGENT_LOGINS = ['copilot-swe-agent', 'Copilot'];

function gh(args, { allowFailure = false } = {}) {
  try {
    return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    if (allowFailure) return null;
    throw new Error(`gh ${args.join(' ')} failed: ${err.stderr || err.message}`);
  }
}

/**
 * Add one label.
 *
 * `gh issue edit` applies its flags as a unit, so removing a label the issue
 * does not carry fails the whole command and silently drops any --add-label
 * passed alongside it. Label operations are therefore always issued singly.
 */
function addLabel(repo, issue, label) {
  const out = gh(['issue', 'edit', String(issue), '--repo', repo, '--add-label', label], {
    allowFailure: true,
  });
  console.log(out === null ? `  could not add ${label} to #${issue}` : `  +${label} on #${issue}`);
  return out !== null;
}

/** Remove one label. A 404 means it was absent, which is already the goal. */
function removeLabel(repo, issue, label) {
  const out = gh(
    [
      'api',
      `repos/${repo}/issues/${issue}/labels/${encodeURIComponent(label)}`,
      '-X',
      'DELETE',
      '--silent',
    ],
    { allowFailure: true }
  );
  console.log(out === null ? `  #${issue} did not carry ${label}` : `  -${label} on #${issue}`);
  return out !== null;
}

function comment(repo, issue, body) {
  gh(['issue', 'comment', String(issue), '--repo', repo, '--body', body], { allowFailure: true });
}

/** Normalize the label shape returned by `gh issue list` and by event payloads. */
function labelNames(issue) {
  return (issue.labels || []).map(l => (typeof l === 'string' ? l : l.name));
}

/** Is the coding agent already working this issue? */
function isAssignedToAgent(issue) {
  const assignees = issue.assignees || [];
  return assignees.some(a => AGENT_LOGINS.includes(a.login));
}

/**
 * Assign the Copilot coding agent to an issue.
 *
 * `assign-to-agent` was the only capability that appeared to require an agentic
 * workflow. It does not: suggestedActors resolves the agent to a Bot node ID
 * and replaceActorsForAssignable assigns it, both from plain API calls.
 *
 * @returns {boolean} true when the agent is assigned
 */
function assignCopilot(repo, issueNumber) {
  const [owner, name] = repo.split('/');

  const actorQuery = `query($owner:String!,$name:String!){
    repository(owner:$owner,name:$name){
      suggestedActors(capabilities:[CAN_BE_ASSIGNED],first:100){
        nodes{ login __typename ... on Bot { id } ... on User { id } }
      }
    }
  }`;
  const actorsRaw = gh(
    ['api', 'graphql', '-f', `query=${actorQuery}`, '-F', `owner=${owner}`, '-F', `name=${name}`],
    { allowFailure: true }
  );
  if (!actorsRaw) {
    console.log('  could not query assignable actors');
    return false;
  }

  const nodes = JSON.parse(actorsRaw).data.repository.suggestedActors.nodes || [];
  const agent = nodes.find(n => AGENT_LOGINS.includes(n.login));
  if (!agent || !agent.id) {
    console.log('  copilot-swe-agent is not assignable — is the coding agent enabled for this repo?');
    return false;
  }

  const idRaw = gh(
    ['issue', 'view', String(issueNumber), '--repo', repo, '--json', 'id', '--jq', '.id'],
    { allowFailure: true }
  );
  if (!idRaw) {
    console.log(`  could not resolve the node id for #${issueNumber}`);
    return false;
  }

  const mutation = `mutation($assignable:ID!,$actor:ID!){
    replaceActorsForAssignable(input:{assignableId:$assignable,actorIds:[$actor]}){
      assignable{ ... on Issue { number } }
    }
  }`;
  const result = gh(
    [
      'api',
      'graphql',
      '-f',
      `query=${mutation}`,
      '-F',
      `assignable=${idRaw.trim()}`,
      '-F',
      `actor=${agent.id}`,
    ],
    { allowFailure: true }
  );
  if (!result) {
    console.log(`  could not assign the coding agent to #${issueNumber}`);
    return false;
  }

  console.log(`  assigned copilot-swe-agent to #${issueNumber}`);
  return true;
}

module.exports = {
  AGENT_LOGINS,
  gh,
  addLabel,
  removeLabel,
  comment,
  labelNames,
  isAssignedToAgent,
  assignCopilot,
};
