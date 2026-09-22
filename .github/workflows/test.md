---
description: "Factory: Validate spec conformance on agent-authored PRs after CI passes"
name: "Factory test"
run-name: "Factory test: PR #${{ github.event.workflow_run.pull_requests[0].number || '?' }}"
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: ["copilot/**", "factory/**"]
  bots:
    - "Copilot"
    - "copilot-swe-agent[bot]"
if: ${{ github.event.workflow_run.conclusion == 'success' }}
permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read
  checks: read
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
    allowed: [factory:needs-human, factory:tests-passed]
concurrency:
  group: "factory-test-${{ github.event.workflow_run.pull_requests[0].number }}"
  cancel-in-progress: true
---

# Factory — spec conformance validation

Validate that an agent-authored PR satisfies its linked spec's acceptance criteria and has sufficient test coverage. This workflow does NOT author new product code or tests — it only assesses and reports.

## Guards

- If the completed workflow run has no attached pull request, stop with `noop`.
- Only continue when the PR has label `factory:agent` and the head branch matches `copilot/*` or `factory/issue-*`.
- If the PR already has a `factory:tests-passed` label, stop with `noop` — already validated.
- Ignore non-agent PRs, human feature branches, and unrelated CI runs.

## Idempotency

Check the PR comments for an HTML comment block containing:

```html
<!-- factory-test-state
```yaml
factory-test:
  status: passed
  run_id: 123456789
  spec_satisfied: true
  tests_sufficient: true
  gaps: []
```
-->
```

If a prior comment shows `status: passed` and no new commits have been pushed since that comment, stop with `noop`.

## Step 1 — Gather context

1. Read the PR diff to identify which source files were added or modified.
2. Read the linked issue/spec (from the PR body's `Closes #N` or `Fixes #N`) to extract:
   - Acceptance criteria
   - Expected behaviors
   - Any explicit test requirements mentioned in the spec
3. Read `.github/copilot-instructions.md` and `.github/factory.yml` for testing conventions.
4. Identify existing test files related to the changed code.

## Step 2 — Spec conformance check

For each acceptance criterion in the linked spec:

1. Determine whether the PR's code changes address the criterion.
2. Check if there is at least one test (unit or e2e) that validates the criterion.
3. Classify each criterion as:
   - ✅ **Satisfied** — code implements it AND a test covers it
   - ⚠️ **Implemented but untested** — code appears correct but no test validates it
   - ❌ **Not addressed** — the criterion is not implemented in this PR

## Step 3 — Test coverage assessment

Evaluate test sufficiency without writing any tests:

1. **Unit tests**: For each changed source file, check:
   - Does a corresponding test file exist?
   - Does it cover the new/changed functions and branches?
   - Are error paths and edge cases tested?

2. **E2E tests**: For each new user-facing behavior:
   - Is there an integration or e2e test exercising it?
   - Are error responses covered?

3. Produce a gap list of untested behaviors.

## Step 4 — Report signals

Post a comment on the PR with three clear signals:

### Signal format

| Signal | Status |
|--------|--------|
| Spec satisfied | ✅ All criteria met / ⚠️ Gaps remain |
| Tests sufficient | ✅ Adequate coverage / ⚠️ Gaps found |
| Ready to merge | ✅ Yes / ❌ No |

### If all criteria are met and tests are sufficient:

1. Add `factory:tests-passed` label.
2. Post the conformance report with status comment:

```html
<!-- factory-test-state
```yaml
factory-test:
  status: passed
  run_id: <this workflow run id>
  spec_satisfied: true
  tests_sufficient: true
  gaps: []
```
-->
```

### If gaps are found:

1. Post a review comment for the coding agent detailing:
   - Which acceptance criteria are not yet satisfied
   - Which behaviors lack test coverage
   - Specific suggestions for what tests should be added (without writing the code)
2. Post the status comment:

```html
<!-- factory-test-state
```yaml
factory-test:
  status: gaps-found
  run_id: <this workflow run id>
  spec_satisfied: false
  tests_sufficient: false
  gaps:
    - "AC #2: endpoint returns 404 for missing resource — no test covers this"
    - "AC #3: HTML form submission — no e2e test"
```
-->
```

Do NOT write code, push commits, or attempt to fix gaps. The coding agent is responsible for addressing the feedback.

## Escalation

If this workflow cannot confidently assess conformance (e.g., spec is ambiguous, no clear acceptance criteria, or the PR changes are unrelated to the linked issue):
- Add `factory:needs-human` label
- Post a comment explaining what couldn't be determined and why human review is needed
