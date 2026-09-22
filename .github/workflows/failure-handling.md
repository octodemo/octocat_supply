---
description: "Factory: Spec-aware failure handling for agent-authored PRs"
name: "Factory failure handling"
run-name: "Factory failure handling: PR #${{ github.event.workflow_run.pull_requests[0].number || '?' }}"
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: ["copilot/**", "factory/**"]
  bots:
    - "Copilot"
    - "copilot-swe-agent[bot]"
if: ${{ github.event.workflow_run.conclusion == 'failure' }}
permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read
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
    toolsets: [pull_requests, issues, actions]
  bash: []
safe-outputs:
  github-token: ${{ secrets.GH_AW_GITHUB_TOKEN }}
  noop:
    report-as-issue: false
  add-comment:
    max: 3
    target: "*"
  add-labels:
    max: 2
    target: "*"
    allowed: [factory:needs-human, factory:blocked]
concurrency:
  group: "factory-failure-${{ github.event.workflow_run.pull_requests[0].number }}"
  cancel-in-progress: true
---

# Factory — spec-aware failure handling

Handle CI failures on Factory agent PRs with bounded repair attempts, spec analysis, and human routing. This replaces blind retry loops with spec-aware analysis at each stage.

## Guards

- If the failed `workflow_run` has no attached pull request, stop with `noop`.
- Only continue when the PR has label `factory:agent` and the head branch matches `copilot/*` or `factory/issue-*`.
- If the PR already has `factory:needs-human` label, stop with `noop` — already escalated.
- Ignore non-agent PRs, human feature branches, and unrelated CI failures.

## State tracking

Repair state is persisted as a machine-readable HTML comment on the PR. Look for the most recent comment containing:

```html
<!-- factory-failure-state
```yaml
failure-handling:
  attempt: 1
  max_attempts: 2
  stage: "agent-repair"
  run_id: 123456789
  error_summary: "Jest test xyz failed — expected 200, got 404"
  history:
    - attempt: 1
      stage: agent-repair
      run_id: 123456789
      outcome: pending
```
-->
```

Parse the latest such comment to determine current attempt count and stage.

## Configuration

Read `ci_repair.max_attempts` from `.github/factory.yml` (under `factory.ci_repair`). Default is `3`. This value determines the maximum number of coding-agent repair attempts before Factory performs a final spec analysis. Store this value in the `max_attempts` field of the state comment.

## Stage 1 — Agent repair (attempts 1 through max_attempts)

If the current attempt count is **less than `max_attempts`** (from config, default 3):

1. Read the failed workflow run's job logs and annotations.
2. Identify the failing step, test, or build error.
3. Read the linked issue/spec (from the PR body's `Closes #N` or `Fixes #N`) to understand what the code is supposed to do.
4. Post a `@copilot` comment on the PR with:
   - The specific error context (failing test name, error message, relevant log lines)
   - Reference to the spec/acceptance criteria that the fix should satisfy
   - A clear instruction: "Please fix this failure while maintaining conformance with the spec in issue #N"
5. Post a state-tracking comment (HTML comment block) with the updated attempt count and error summary.

Do NOT attempt to fix the code directly. The coding agent will respond to the `@copilot` comment.

## Stage 2 — Factory spec analysis (after max_attempts failed agent attempts)

If the attempt count has reached **`max_attempts`** (from config) and the failure persists:

1. Read the full failure history from state comments.
2. Read the linked spec/issue to understand the original intent.
3. Analyze whether the failure indicates:
   - A spec gap (the spec doesn't cover the case that's failing)
   - A spec conflict (the spec asks for something incompatible with the codebase)
   - An environmental issue (flaky test, missing dependency, infra problem)
4. Post a comment summarizing:
   - What was tried (both agent repair attempts)
   - Root cause analysis
   - Whether the spec needs amendment or the implementation approach needs rethinking
   - Recommended next action
5. Update the state comment to `stage: "factory-analysis"`.
6. If the spec needs amendment: note the specific changes needed and post them as a suggestion in the comment. Update state to `stage: "spec-amendment-pending"`.
7. If the issue is environmental or infra: add `factory:needs-human` label and stop.

## Stage 3 — Human escalation

If Factory analysis has already been performed (state shows `stage: "factory-analysis"` or `stage: "spec-amendment-pending"`) and a new failure occurs:

1. Add the `factory:needs-human` label.
2. Post a final escalation comment with:
   - Full failure timeline (all attempts, stages, outcomes)
   - The spec context and what was tried
   - Why automated resolution failed
   - Suggested actions for the human reviewer
3. Update state to `stage: "escalated"`.

## Summary of flow

```
CI failure on agent PR
  → Read ci_repair.max_attempts from .github/factory.yml (default: 3)
  → Attempt 1: @copilot comment with error context + spec reference
    → CI failure again
  → Attempt 2..N: @copilot comment with updated context
    → CI failure again (after max_attempts reached)
  → Factory analysis: root cause + spec review
    → CI failure again
  → Human escalation: factory:needs-human label
```
