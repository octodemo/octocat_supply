---
description: "Factory: Review agent-authored PRs against the originating spec"
name: "Factory review"
run-name: "Factory review: PR #${{ github.event.pull_request.number }}"
on:
  pull_request:
    # `labeled` is deliberately absent. Factory's own workflows stamp several
    # labels on a PR within about a second of it becoming ready
    # (factory:agent, factory:tests-passed, then factory:approved from this
    # workflow), and each one spawned another review run that the concurrency
    # guard then cancelled — roughly five runs per PR (#123).
    #
    # `synchronize` replaces it and is the trigger that was actually wanted:
    # re-review when the coding agent pushes a fix. That path was relying on an
    # incidental `labeled` event, which is why re-review never reliably fired
    # (#145).
    types: [opened, ready_for_review, synchronize]
    branches: [main]
  bots:
    - "Copilot"
    - "copilot-swe-agent[bot]"
  skip-bots: [github-actions]
permissions:
  contents: read
  issues: read
  pull-requests: read
  copilot-requests: write
strict: true
imports:
  - copilot-setup-steps.yml
checkout:
  fetch: ["*"]
  fetch-depth: 0
network:
  allowed: [defaults, github, github-actions]
tools:
  github:
    toolsets: [pull_requests, issues]
  bash: []
safe-outputs:
  github-token: ${{ secrets.GH_AW_GITHUB_TOKEN }}
  noop:
    report-as-issue: false
  create-pull-request-review-comment:
    max: 10
    target: "*"
  add-labels:
    max: 3
    target: "*"
    allowed: [factory:approved, factory:needs-human, factory:changes-requested]
  add-comment:
    max: 3
    target: "*"
concurrency:
  group: "factory-review-${{ github.event.pull_request.number }}"
  cancel-in-progress: true
---

# Factory — review agent-authored PRs

This workflow reviews PRs opened by the Copilot coding agent against the originating sub-issue spec. It is a **spec reviewer**, not a style linter or second implementer. All review feedback is anchored in the sub-issue's acceptance criteria.

## Guards

- If the trigger is `pull_request.labeled` and the PR already has `factory:approved` or `factory:changes-requested`, stop with `noop`. This prevents re-review when the workflow itself adds a label.
- If the PR has no `factory:agent` label **and** the head branch does not match `copilot/*` or `factory/issue-*`, stop with `noop`.
- If the PR is a draft, stop with `noop`.
- If the PR is already merged or closed, stop with `noop`.

## Idempotency

Check the PR comments for a fenced YAML marker:

```yaml
factory-review:
  status: approved|changes_requested
  run_id: <workflow-run-id>
  sha: <head-sha-at-review-time>
```

If a prior marker exists with the same `sha` as the current PR head, stop with `noop` — this commit was already reviewed. This prevents duplicate reviews on re-runs and re-labeling events.

## Step 1 — Resolve the linked spec

Parse the PR body for `Closes #N` or `Fixes #N` to find the linked sub-issue number. Read that issue and extract:

1. **Acceptance criteria** — the checklist items from the issue body.
2. **Scope constraints** — which files/areas the issue targets.
3. **Decision policy** — what the agent was allowed to decide vs. must escalate.
4. **Parent intent** — read the parent issue (from the fenced `factory:` YAML block's `parent` field) for high-level goals and context.

If no linked issue is found, post a comment asking the PR author to link one, and stop.

## Step 2 — Read the PR diff

Fetch the full diff of the PR. Build a mental model of:

- Which files were added, modified, or deleted.
- What behavior was introduced or changed.
- Whether any changes fall outside the scope defined in the sub-issue.

## Step 3 — Read configuration

Read `.github/factory.yml` for any project-level review configuration. Note any special instructions for review behavior.

## Step 4 — Spec comparison

For each acceptance criterion in the linked issue, determine:

| Criterion | Status |
|-----------|--------|
| Fully satisfied | ✅ |
| Partially satisfied | ⚠️ |
| Not addressed | ❌ |
| Over-delivered (out of scope) | 🔍 |

Build a structured assessment. Focus on:

1. **Missing acceptance criteria** — required behavior not implemented.
2. **Incorrect scope** — changes to files or areas not mentioned in the spec.
3. **Unsafe interpretation** — the agent made a decision it should have escalated per the decision policy.
4. **Over-delivery** — extra features or refactoring not requested (flag but don't block).

## Step 5 — Render the review

Based on the assessment from Step 4:

### Case A: All criteria satisfied ✅

1. Submit an approving review with a summary confirming each criterion is met.
2. Add the `factory:approved` label to signal the PR is ready for merge.
3. Post idempotency marker comment.

### Case B: One or more criteria NOT satisfied ❌ / ⚠️

1. Post targeted review comments on the specific lines or files that fail criteria. Each comment must:
   - Reference which acceptance criterion is not met.
   - Explain what is expected vs. what was implemented.
   - Distinguish **spec mismatches** (blocking) from **optional improvements** (non-blocking suggestions).
2. Submit a "request changes" review addressed to `@copilot` to trigger agent iteration. The review body should include:
   - A numbered list of required changes (blocking).
   - A separate section of optional suggestions (non-blocking).
3. Add `factory:changes-requested` label.
4. Post idempotency marker comment with `status: changes_requested`.

### Case C: Scope violation or unsafe interpretation 🔍

If the PR introduces changes outside the defined scope or makes decisions the agent should have escalated:

1. Post review comments explaining the scope concern.
2. If the scope violation is minor and all criteria are still met, approve with a note.
3. If the scope violation introduces risk, request changes.
4. If a decision-policy escalation was missed, add `factory:needs-human` label and post a comment explaining what needs human judgment.

## Review comment guidelines

- Every blocking comment must cite the specific acceptance criterion it relates to.
- Use the prefix `[SPEC]` for spec-mismatch comments (blocking).
- Use the prefix `[SUGGESTION]` for optional improvements (non-blocking).
- Keep comments actionable — say what to do, not just what's wrong.
- Do not comment on style, formatting, or minor preferences unless they violate explicit project conventions in `.github/copilot-instructions.md`.

## Escalation

If the workflow cannot determine whether the PR satisfies the spec (ambiguous criteria, missing context, or conflicting requirements):

- Add `factory:needs-human` label.
- Post a comment explaining which criteria are ambiguous and what human judgment is needed.
- Do NOT approve or request changes — leave the PR in a neutral state for human review.
