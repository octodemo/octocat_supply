---
description: "Factory: Unblock cross-scope dependents when a dependency resolves"
name: "Factory cross-scope sync"
run-name: "Factory sync: parent #${{ inputs.parent_issue_number }}"
on:
  workflow_dispatch:
    inputs:
      closed_issue_number:
        description: "Issue number that just closed and may unblock cross-scope dependents"
        required: true
      parent_issue_number:
        description: "Parent intent issue number"
        required: true
      closed_scope:
        description: "Scope of the issue that just closed"
        required: false
      source:
        description: "Workflow that dispatched this run"
        required: false
permissions:
  contents: read
  issues: read
  copilot-requests: write
strict: true
network:
  allowed: [defaults, github]
tools:
  bash: []
  github:
    toolsets: [issues]
safe-outputs:
  github-token: ${{ secrets.GH_AW_GITHUB_TOKEN }}
  noop:
    report-as-issue: false
  add-labels:
    max: 8
    target: "*"
    allowed: ["factory:ready"]
  remove-labels:
    max: 8
    target: "*"
    allowed: ["factory:blocked"]
  add-comment:
    max: 4
    target: "*"
  assign-to-agent:
    max: 8
    target: "*"
---

# Factory — cross-scope dependency sync

When a child issue closes that is a cross-scope dependency for issues in other scopes, this workflow finds and unblocks those dependents.

## Guards
- If `inputs.closed_issue_number` is empty, stop with `noop`.
- If `inputs.parent_issue_number` is empty, stop with `noop`.

## Steps
1. Read the parent intent issue to get the full list of child issues (sub-issues).
2. For each open child issue in a **different** scope than `inputs.closed_scope`:
   - Parse its fenced YAML `factory` block.
   - Check its `depends_on` list for `inputs.closed_issue_number` (directly or via `"NUMBER:SCOPE"` extended syntax).
   - If the closed issue is in `depends_on`, check whether ALL other dependencies are also satisfied (closed).
3. For each newly-unblocked issue (all dependencies now closed):
   - Add `factory:ready` label.
   - Remove `factory:blocked` label if present.
   - Use `assign-to-agent` to assign `copilot-swe-agent[bot]` directly to the unblocked issue.
4. Post a comment on the parent issue summarizing which cross-scope issues were unblocked and assigned to Copilot.

## Backward compatibility
- If `inputs.closed_scope` is empty (unscoped repo), this workflow has nothing to do — cross-scope sync only applies when scopes are configured. Stop with `noop`.
- This workflow is never dispatched for unscoped repos, but the guard ensures safe behavior if called accidentally.

## Concurrency
- Concurrency group: `factory-cross-scope-sync-{parent_issue_number}` — only one sync per parent at a time to avoid races.
