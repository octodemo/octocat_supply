---
description: "Factory: Decompose intent issues into implementation-ready sub-issues for Copilot"
name: "Factory decompose"
run-name: "Factory decompose: #${{ inputs.issue_number }}"
on:
  workflow_dispatch:
    inputs:
      issue_number:
        description: "Issue number to decompose"
        required: true
        type: string
  skip-bots: [github-actions]
permissions:
  contents: read
  issues: read
  copilot-requests: write
strict: true
checkout:
  fetch: ["*"]
  fetch-depth: 0
network:
  allowed: [defaults, github]
tools:
  github:
    toolsets: [issues, repos, search]
  bash: []
safe-outputs:
  github-token: ${{ secrets.GH_AW_GITHUB_TOKEN }}
  noop:
    report-as-issue: false
  create-issue:
    max: 48
    labels: [factory:blocked]
    title-prefix: ""
    group: false
  link-sub-issue:
    max: 48
  add-comment:
    max: 5
    target: "*"
  add-labels:
    max: 128
    target: "*"
    allowed:
      [
        "factory:blocked",
        "factory:needs-human",
        "factory:scope:*",
        "factory:decomposing",
        "factory:decomposed",
      ]
  remove-labels:
    max: 64
    target: "*"
    allowed: ["factory:blocked", "factory:decomposing"]
concurrency:
  group: "factory-decompose-${{ github.event.issue.number || inputs.issue_number }}"
  cancel-in-progress: false
---

# Factory — intent decomposition

Decompose one parent intent issue into a set of ordered, implementation-ready child issues in the current repo.

Each child is a rich spec that Copilot can implement directly. Labels are state and UI only; they are **not** the handoff.

## Trigger and target issue

- The target issue number is `${{ inputs.issue_number || github.event.issue.number }}`.
- Continue only when this run came from:
  - an `issues.labeled` event whose added label is `factory:intent`, or
  - `workflow_dispatch`.
- Manual dispatch is supported, but the target issue must still be a valid open parent intent issue.

## Non-negotiable guards

Before changing anything:

1. Read the target issue. If it is missing, deleted, or inaccessible, stop with `noop`.
2. If the issue is closed, stop with `noop`.
3. If the issue does not currently have the `factory:intent` label, stop with `noop`.
4. If the issue body is empty or whitespace-only, stop with `noop`.
5. Parse fenced code blocks only. If the issue body contains a fenced YAML block whose top-level key is `factory`, this is already a Factory child issue. Stop with `noop`.
6. If the parent already has either `factory:decomposing` or `factory:decomposed`, stop with `noop`.
7. If the parent already has linked sub-issues, stop with `noop`.
8. If the parent already has a prior parent-specific completion summary comment for this decomposition, stop with `noop`.

Do **not** use repo-wide label scans or a plain `^factory:` grep as your guard. Child detection must be based on the fenced YAML metadata block, and existing-child detection must be scoped to this parent.

## Parent state machine and narration

If the guards pass:

1. Normalize the parent title so it starts with `🎯 ` exactly once.
2. Add `factory:decomposing` to the parent issue before planning.
3. Post a start narration comment only if this parent does **not** already have one. The comment should begin with `🔀 **Decomposition starting**` and note that analysis and planning are underway.

Leave `factory:decomposing` in place for the rest of this run. You do **not** remove it or add `factory:decomposed` yourself — the non-agentic **Factory: Finalize decompose** workflow verifies the plan after this run and performs that state transition (or escalates to `factory:needs-human` if the plan is incomplete). See "Handoff" below.

## Read before planning

Read, in order:

1. The parent issue title and full body.
2. `.github/copilot-instructions.md`.
3. `.github/factory.yml`.
4. The relevant repository structure and the most relevant code, tests, docs, and workflows so the slices fit the existing architecture.

## Scope configuration

Load the `scopes` array from `.github/factory.yml`.

- If `scopes` is missing or empty, plan the repo as unscoped.
- If `scopes` is present, every child issue must belong to exactly one configured scope.
- Include the chosen scope in the child metadata block.
- Add the label `factory:scope:<scope-name>` to each child after it is created.
- Scope membership controls parallel starts: the first ready issue in **each** scope may begin immediately.

## Planning goal

Produce:

- **2-6** ordered child issues per scope when scopes are configured, or
- **2-6** ordered child issues total when the repo is unscoped.

Prefer fewer, larger slices over many tiny ones. Each slice must:

- be independently implementable in one PR,
- deliver visible, testable progress,
- stay concrete enough for implementation without reinterpretation,
- preserve architectural sequencing such as data models before APIs and APIs before UI where that matters.

## Child issue title and body contract

Every child issue must:

1. Have a title that starts with `⚡ ` exactly once.
2. Start its body with `Parent intent: #${{ inputs.issue_number || github.event.issue.number }}`.
3. Immediately follow that line with a fenced YAML block in this shape:

   ```yaml
   factory:
     parent: ${{ inputs.issue_number || github.event.issue.number }}
     order: <1-based-order>
     total: <total-child-count>
     depends_on: [<earlier-issue-number-or-empty>]
     slug: <short-kebab-case-slice-name>
     scope: <scope-name-if-scoped>
   ```

   Omit `scope` entirely when the repo is unscoped.

4. Then include these four sections in this exact order:

   ### `## Outcome`
   What will be true when the slice is done. One or two sentences describing the observable result.

   ### `## Scope`
   The files, modules, endpoints, jobs, or subsystems that should change. Be explicit:
   - List specific file paths or glob patterns (e.g. `src/routes/users.js`, `__tests__/users.test.js`)
   - Name the modules, functions, or classes involved
   - Identify new files that must be created

   ### `## Acceptance criteria`
   Testable checkbox bullets using the exact format `- [ ] ...`. Each criterion must be verifiable by running tests or inspecting behavior. Include:
   - Expected HTTP status codes and response shapes for API routes
   - Expected test commands and their pass conditions
   - Edge cases and error handling expectations
   - Performance or security constraints if relevant

   ### `## Notes for implementer`
   Brief pointers only: exact file paths to create/modify, existing code/patterns to mirror **by reference** (name the file — do not paste it), key constraints ("do not…"), and what prior siblings this depends on.

**Keep every child body concise — target under ~1200 characters.** Convey intent by referencing files, patterns, and acceptance criteria; do **not** paste large code samples, full class definitions, or example payloads. Verbose bodies risk the run ending before all children are created. The acceptance criteria still must be specific enough for the Copilot cloud agent to implement and test without reinterpretation.

## Execution rules

1. Plan the full set of children first, grouped by scope when scoped, including temporary identities, final order, scope, dependency chain, and slug.
2. Create all child issues via `create-issue`. Create them in final order so every `depends_on` entry refers to real earlier issue numbers.
3. Every child created via `create-issue` automatically receives the `factory:blocked` label (configured in safe-outputs). Do **not** manually add `factory:blocked` via `add-labels` — it is already applied.
4. Link **every** child to the parent with the real `link-sub-issue` output. GitHub sub-issue linking is required; narrative comments alone are not enough.
5. If scoped, add exactly one `factory:scope:<scope-name>` label to each child.
6. Do **not** promote any child, change the parent's labels, or hand off to the Copilot agent. After all children are created, linked, and scoped, **stop**. The non-agentic **Factory: Finalize decompose** workflow performs promotion and handoff deterministically once it confirms the plan is complete (see "Handoff" below).

## Label formatting rule

- Label names are plain strings like `factory:blocked` — never wrap them in brackets like `[factory:blocked]`.
- Labels are state/UI only; the deterministic finalize workflow plus the router chain perform the actual handoff.

## Safe outputs are staged — never read them back

`create-issue`, `link-sub-issue`, `add-labels`, and `add-comment` do **not** take
effect while you are running. They are collected and applied by a separate job
**after** this run ends. A `{"result":"success"}` response means *staged
successfully*, nothing more.

Therefore:

- The child issues you create **do not exist on GitHub during this run** and have
  no issue numbers yet.
- **Never** call `Search issues`, `List issues`, `Get issue`, or any other GitHub
  tool to confirm a child was created, labelled, or linked. It will correctly
  report that the issue is not there, and you will be stuck trying to reconcile a
  contradiction that is not real.
- Emit every `create-issue` and `link-sub-issue` call in one uninterrupted
  sequence, then post the completion comment and stop. Do not pause to check
  your work against the repository between calls.

Idling to reconcile staged-versus-actual state is the single most likely way for
this workflow to be killed mid-plan, leaving a partial decomposition that the
finalize workflow has to escalate.

## Plan self-check (before you emit anything)

Verification happens against **your plan**, not against the repository. Before
emitting the first `create-issue`, confirm all of the following about the set of
children you are about to create:

1. There is at least one child.
2. Every child has a `link-sub-issue` call planned against this parent.
3. Every child has the parent line, the fenced YAML `factory` block, a unique
   `order`, the correct `total`, and a `⚡ ` title prefix.
4. Every child body contains all four required sections: Outcome, Scope,
   Acceptance criteria, Notes for implementer.
5. If scoped, every child has exactly one valid `factory:scope:<scope-name>`
   label. Do not add `factory:blocked` — safe-outputs applies it automatically.
6. The `total` in every child's metadata equals the number of children you are
   about to create. This is critical: the finalize workflow compares the created
   count against `total` to decide whether to promote or to escalate. If you
   emit fewer children than `total`, the run is treated as a failure.

If the plan fails this check, fix the plan before emitting anything. If you
cannot produce a valid plan, stop with an error instead of emitting a partial
set or posting a misleading completion comment.

## Final summary comment

Post exactly one completion comment on the parent, and only if an equivalent completion comment does not already exist for this parent. The comment should begin with `📋 **Decomposition complete**`.

The completion comment is the final summary and must:

- report how many child issues were created,
- list **only this parent's children** in order,
- group them by scope when scopes are configured,
- mention that labels are state/UI only,
- note that once the plan is verified complete, execution starts automatically (the first child is promoted and handed to the Copilot agent).

Do **not** summarize unrelated repo issues, repo-wide ready queues, or children belonging to another parent.

## Parent label safety rule

The parent intent issue must **never** receive the `factory:blocked` label. This label is exclusively for child sub-issues that are waiting for a predecessor to complete. If the parent needs to wait for human input, use `factory:needs-human` instead. Adding `factory:blocked` to the parent will cause the promote-first-subissue guardrail to misidentify the parent as a promotable child.

## Handoff (do not finalize yourself)

After creating, linking, and scoping all children, and posting the completion comment, **stop**. Leave `factory:decomposing` on the parent.

Do **not**:

- add `factory:decomposed` or remove `factory:decomposing`,
- promote any child to `factory:ready`,
- use `assign-to-agent`,
- add `factory:needs-human`.

The non-agentic **Factory: Finalize decompose** workflow runs immediately after this run. It compares the number of children you created against the `total` in their metadata and then:

- if complete, adds `factory:decomposed` and clears the lock — which starts execution automatically via the router and `promote-first-subissue` (or applies `factory:needs-human` instead when `approval.plan.require_approval` is `true`);
- if incomplete, escalates with `factory:needs-human` and a comment describing exactly what is missing.

This guarantees the pipeline never stalls silently even if this run ends early. Plan approval (`approval.plan.require_approval`) is handled entirely by that workflow — you do not read or act on it here.
