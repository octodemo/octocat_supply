---
description: "Factory: Escalate to humans after automated paths are exhausted"
name: "Factory decision gate"
run-name: "Factory decision gate: #${{ inputs.issue_number }}"
on:
  workflow_dispatch:
    inputs:
      issue_number:
        description: "Issue number for the decision gate"
        required: true
        type: string
  skip-bots: [github-actions]
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
    toolsets: [issues, repos]
safe-outputs:
  github-token: ${{ secrets.GH_AW_GITHUB_TOKEN }}
  noop:
    report-as-issue: false
  add-labels:
    max: 3
    target: "*"
    allowed: [factory:needs-decision, factory:ready, factory:in-progress]
  remove-labels:
    max: 4
    target: "*"
    allowed: [factory:needs-human, factory:needs-decision, factory:resume, factory:blocked]
  add-comment:
    max: 3
    target: "*"
  dispatch-workflow:
    workflows: [decompose]
    max: 1
  assign-to-agent:
    max: 1
concurrency:
  group: "factory-decision-${{ github.event.issue.number }}"
---

# Factory — human decision gate

This workflow is the **last-resort** human escalation point for Factory. By the time this fires, Factory's automated workflows and the Copilot coding agent have already attempted to resolve the issue and failed. The human is not being asked to "take over" — they are being asked for the **smallest possible input or decision** that unblocks automation.

It has **two modes**:

1. **Escalation mode** — when `factory:needs-human` is applied, post an escalation packet explaining what was tried, why it failed, and exactly what the human needs to provide.
2. **Resume mode** — when a human applies `factory:resume`, read their comment, route back to the correct next step, and remove both `factory:needs-human` and `factory:resume`.

## Escalation philosophy

- **Minimal ask**: request the smallest decision or input that unblocks the pipeline. Do not ask the human to implement anything that automation can handle once unblocked.
- **Full transparency**: always explain what Factory automation and Copilot already tried and why those attempts failed.
- **Clear contract**: tell the human exactly what format their answer should take and how to signal completion.

## Global guard rules

- This workflow only fires on `issues: [labeled]` events for `factory:needs-human` or `factory:resume`. No other trigger exists.
- **If the labeled event is `factory:needs-human`**: run escalation mode (Mode 1).
- **If the labeled event is `factory:resume`**: run resume mode (Mode 2).
- Operate only on the current issue.
- Do not reopen settled decisions or restart old debates.
- Labels are **state only**. The actual resume signal is a `dispatch-workflow` or `assign-to-agent`.
- After a successful resume, remove both `factory:needs-human` and `factory:resume` from the issue.

---

## Mode 1 — escalation packet

Run this mode only when the event is an issue being labeled with `factory:needs-human`.

### Step 1 — classify the escalation type

Read the issue title, body, labels, and **all** comments (especially the most recent ones from automation).

Classify as one of:

| Type | Signal | Meaning |
|------|--------|---------|
| **Product/architecture decision** | `factory:needs-decision` label present | A design choice is needed that automation cannot make on its own |
| **Implementation dead-end** | No `factory:needs-decision` label | Factory automation and Copilot tried to implement but hit a wall they cannot get past |

The labels are authoritative. Do not reclassify based on tone alone.

### Step 2 — gather failure context

From the issue comments and linked PR (if any), extract:

1. **What was attempted** — which workflows ran and what automation tried to do.
2. **Why it failed** — error messages, CI failures, logical dead-ends, or missing information.
3. **Retry count** — how many automated attempts were made (look for `factory-retry` markers or multiple workflow run comments).

This context is required for the escalation comment. If the issue has no automation history (e.g., it was manually escalated during planning), note that explicitly.

### Step 3 — post the escalation comment

Post **one** escalation comment structured as follows:

#### For a product/architecture decision:

```markdown
## 🚦 Decision needed

### What was attempted
<Summary of what Factory automation and Copilot tried before escalating. Reference specific
comments or workflow runs if available.>

### Why automation cannot proceed
<Clear explanation of the blocking ambiguity or tradeoff that requires human judgment.>

### Options

| Option | Pros | Cons |
|--------|------|------|
| ... | ... | ... |

### Recommendation
<Lowest-risk default if one is clear, or "No clear default — human judgment required.">

### What we need from you
<Exact question or decision in one sentence.>

### How to signal your decision
1. Comment on this issue with your chosen option and brief rationale
2. Apply the `factory:resume` label
3. Automation will resume within minutes
```

#### For an implementation dead-end:

```markdown
## 🚦 Human input needed

### What was attempted
<Summary of Factory automation and Copilot attempts. Include retry count, which workflows ran,
and what approaches were tried.>

### Why it failed
<Root cause: CI error, missing config, external dependency, logical contradiction, etc.
Include relevant error snippets (keep under 20 lines).>

### What we need from you
<The specific input, fix, or guidance needed. Be precise — e.g., "provide the API key
for service X" or "clarify whether the endpoint should return 404 or 204 for missing
resources.">

### How to signal resolution
1. Comment on this issue with the answer or confirmation
2. Apply the `factory:resume` label
3. Automation will reassign to Copilot and resume implementation
```

Keep the escalation focused. Do not include setup instructions, file lists, or implementation guides — automation will handle those once unblocked.

### Step 4 — post the metadata comment

Post a second comment with a compact metadata block:

```markdown
🙋 **Escalation active** — Factory automation and Copilot have exhausted automated attempts.

- **Escalated at:** <UTC timestamp>
- **Type:** <Decision | Implementation dead-end>
- **Workflow run:** <link to this run>
- **Automated attempts:** <count or "manual escalation during planning">

**To resolve:** comment with the requested input, then apply `factory:resume`.
```

Do not post more than these two framing comments.

---

## Mode 2 — resume after human response

Run this mode only when the event is the `factory:resume` label being applied.

### Step 1 — eligibility checks

Before doing anything:

1. **Escalation or plan-approval check** — the issue is in one of two states:
   - **Standard escalation**: has `factory:needs-human` label and an escalation packet comment from this workflow (Mode 1), OR
   - **Plan approval**: has both `factory:decomposed` and `factory:needs-human` labels, plus a comment beginning with `📋 **Plan approval required**` from the decompose agent. This means the human approved the decomposition plan by applying `factory:resume`.
2. **Open check** — issue is still open, not already resolved by a linked PR or close event.
3. **Substantive check** — for standard escalations, the issue has a human comment posted AFTER the escalation packet that provides the requested decision or input. For plan approvals, the `factory:resume` label itself is sufficient signal — no additional comment is required (the human reviewed the plan and approved it).

If **none** of the above states match, stop with `noop`. Specifically:

- No escalation packet AND no plan-approval comment found → `noop`.
- Issue already closed or has a merged PR → `noop` (another flow owns it).
- Standard escalation with no human comment after the escalation → `noop` (human applied `factory:resume` prematurely).
- Late follow-up after the issue has already resumed → `noop`.

### Step 2 — determine the resume route

Based on the escalation type and human response, choose exactly one route:

| Condition | Route | Action |
|-----------|-------|--------|
| **Plan approval**: issue has `factory:decomposed` label and child sub-issues exist | **Promote first child** | Find the lowest-order open child with `factory:blocked`, remove `factory:blocked`, add `factory:ready`, and use `assign-to-agent` on that child. Do **not** assign the parent to Copilot. |
| Decision escalation; human chose an option | **Reassign to Copilot** | Use `assign-to-agent` to reassign the issue to Copilot coding agent |
| Implementation dead-end; human provided missing info/config | **Reassign to Copilot** | Use `assign-to-agent` to reassign the issue to Copilot coding agent |
| Implementation dead-end; human says the approach is wrong | **Re-decompose** | Dispatch `decompose` with `source: decision-gate` |
| Human explicitly says "resolved" or closes the issue | **Mark done** | No dispatch needed; normalize labels only |

**Critical — plan approval detection**: check for the `factory:decomposed` label on the current issue **first**, before evaluating any other route. If `factory:decomposed` is present and the issue has linked child issues (sub-issues with `Parent intent: #<this_issue>` in their body), always take the "Promote first child" route regardless of the human's comment content. The human applied `factory:resume` to approve the plan, not to assign themselves.

If the route is ambiguous from the human's comment and `factory:decomposed` is NOT present, default to `assign-to-agent`.

### Step 3 — post a brief resume comment

Post **one** short comment (2–4 sentences max):

- Summarize the human's decision or input.
- State which route automation is taking next.
- Do not relitigate or editorialize.

Example: *"Resolved: using PostgreSQL for the session store per @human's decision. Reassigning to Copilot to resume implementation."*

### Step 4 — normalize labels

1. Remove `factory:resume` (the trigger label — consumed).
2. Remove `factory:needs-human` (escalation resolved).
3. Remove `factory:needs-decision` if present.
4. For **plan approval** route: do **not** add `factory:ready` to the parent. The parent already has `factory:decomposed` which is its correct terminal state during execution. Adding `factory:ready` to the parent would cause the router to dispatch `implement` on the parent — which is wrong.
5. For all other routes: add `factory:ready` to the current issue (signals it is unblocked).

Do not touch unrelated labels.

### Step 5 — dispatch or assign

Execute the chosen route from Step 2:

- **Promote first child** (plan approval): find the lowest-order open child issue of this parent (look for issues whose body contains `Parent intent: #<this_issue_number>` and a fenced `factory:` YAML block). From those, select the one with the lowest `order` value that is still open and has `factory:blocked`. Remove `factory:blocked` from that child, add `factory:ready` to that child, then use `assign-to-agent` on **that child issue** (not the parent). This is the canonical handoff — the child issue is now the active work item.
- **Reassign to Copilot**: `assign-to-agent` on the current issue.
- **Re-decompose**: `dispatch-workflow: decompose` with issue number and `source: decision-gate`.
- **Mark done**: no dispatch. Labels are sufficient.
