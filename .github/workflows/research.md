---
description: "Factory: Deep investigation phase before decomposition"
name: "00 Research"
run-name: "Factory research: #${{ inputs.issue_number }}"
on:
  workflow_dispatch:
    inputs:
      issue_number:
        description: "Issue number to research"
        required: true
        type: string
permissions:
  contents: read
  issues: read
  copilot-requests: write
strict: true
network:
  allowed: [defaults, github, github-actions]
tools:
  bash: []
  github:
    toolsets: [issues, repos, search]
safe-outputs:
  github-token: ${{ secrets.GH_AW_GITHUB_TOKEN }}
  noop:
    report-as-issue: false
  add-comment:
    max: 3
  add-labels:
    max: 1
    allowed: ["factory:intent", "factory:needs-decision"]
  remove-labels:
    max: 1
    allowed: ["factory:research"]
---

# Factory — research phase

Perform deep investigation on an issue before it enters the build pipeline. Produce structured findings, then promote the issue or escalate for a human decision.

## Non-negotiable guards
- If the triggering label is not `factory:research`, stop with `noop`.
- If the issue is already closed, stop with `noop`.
- If the issue already has the `factory:intent` label, stop with `noop`.
- If the issue already contains a comment with the marker `<!-- factory:research-complete -->`, this issue has already been researched. Stop with `noop`.

## Investigation process

1. **Read the issue** — understand the problem statement, any constraints mentioned, and what the author is trying to achieve.
2. **Read repository context** — examine `.github/copilot-instructions.md`, repository structure, and relevant source files to understand the current state of the codebase.
3. **Research the topic** — use all available tools to gather information:
   - Search the repository for related code, patterns, and prior art.
   - Search GitHub for relevant issues, discussions, or implementations in other repos.
   - Use web search for external documentation, best practices, or library comparisons when needed.
4. **Synthesize findings** — organize what you learned into a structured analysis.

## Research comment format

Post a single comment on the issue with the following structure:

```markdown
<!-- factory:research-complete -->

## Research findings

### Problem statement
<Concise restatement of what needs to be solved and why>

### Options considered
| Option | Pros | Cons |
|--------|------|------|
| ... | ... | ... |

### Recommendation
<Your recommended approach with rationale>

### Open questions
<Any unresolved questions or areas needing human judgment — omit section if none>

### References
<Links to relevant docs, code, or prior art discovered during research>
```

The `<!-- factory:research-complete -->` HTML comment MUST be the very first line of the comment body. This is the idempotency marker that prevents duplicate research runs.

## Promotion vs escalation

After posting the research comment, decide the next step:

### Promote to intent (autonomous path)
If the research produced a clear recommendation with no blocking open questions:
1. Remove `factory:research` label.
2. Add `factory:intent` label to promote the issue into the build pipeline.

### Escalate for human decision (blocked path)
If the research reveals trade-offs that require human judgment, unresolvable ambiguity, or multiple viable approaches with no clear winner:
1. Remove `factory:research` label.
2. Add `factory:needs-decision` label.
3. Ensure the "Open questions" section in the research comment clearly describes what decision is needed and what information would unblock it.

## Constraints
- Make zero assumptions about the programming language, framework, or tooling used in the repository.
- Keep the research comment concise but thorough — aim for actionable findings, not exhaustive surveys.
- Do not modify any code or create any issues. This workflow only reads and comments.
- Do not promote to intent if there are genuine unresolved questions that a human should weigh in on.
