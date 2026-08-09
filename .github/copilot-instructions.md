# OctoCAT Supply Chain Management Application – General Copilot Instructions

These are repository-wide guidelines. Path‑scoped files in `.github/instructions/*.instructions.md` provide focused guidance for specific areas (frontend, API, database).

## High-Level Architecture
TypeScript monorepo with:
- `api/` Express REST API (SQLite persistence, repository pattern, Swagger docs)
- `frontend/` React + Vite + Tailwind UI
- Shared demo + infra docs under `docs/` and deployment scripts under `infra/`

Refer to `docs/architecture.md` and `docs/sqlite-integration.md` for deeper details. Avoid restating them in reviews and link instead.

## General Review Guidance
When generating suggestions:
1. Prefer incremental, minimal diffs; preserve existing style and naming.
2. Surface security, correctness, and data integrity issues before micro-optimizations.
3. Encourage type safety (no `any` unless justified). Suggest adding/refining model or DTO types when gaps appear.
longs in a shared utility or repository method.
5. Ensure error handling uses existing custom error types where appropriate (e.g., NotFound, Validation, Conflict) and propagates consistent HTTP status codes via middleware.
6. Encourage tests: request unit tests for new repository logic and component tests (or at least React Testing Library coverage) for critical UI paths.
7. For performance concerns, highlight N+1 query patterns, unnecessary data loading, or large bundle additions.
8. Prefer environment variable driven configuration; avoid hard‑coded paths/secrets.

## Monorepo Workflow
- Build frequently: `npm run build --workspace=api` or `--workspace=frontend` (root build runs both)
- Keep PRs scoped: code + tests + docs (architecture or build notes) when behavior changes.
- Update related instruction files if new folders or architectural slices are introduced.

## Do Not Repeat
Do not inline full API route or component files in review feedback unless absolutely necessary: quote only the lines requiring change. Summarize low‑impact nits.

## Escalation Order for Suggestions
1. Security / data integrity
2. Logical / functional correctness
3. Performance / scalability
4. Maintainability / duplication
5. Readability / consistency
6. Style / minor formatting

## Tone & Feedback Style
## Agent Orchestration & Tooling

This project uses multiple agents and tools:
- **GitHub Copilot**: Code suggestions, refactoring, and documentation.
- **Claude**: Advanced code review, documentation generation, and natural language tasks.
- **Playwright**: End-to-end frontend testing (see PLAYWRIGHT.md).
- **Context7**: Contextual code analysis and search (see CONTEXT7.md).
- **Atlassian MCP**: Issue and project management integration (see ATLASSIAN_MCP.md).

### Commit Message Style
- Use Conventional Commits (feat, fix, chore, docs, refactor, test, etc.)
- Reference issues when relevant
- Keep subject under 72 characters
- Use imperative mood
See COMMIT_STYLE.md for details and examples.

### Agent Guidelines
- Prefer Copilot for code generation
- Prefer Claude for documentation and review
- Use Playwright for all frontend E2E tests
- Use Context7 for codebase search
- Use Atlassian MCP for project management
Be concise, actionable, and cite a rationale ("because" clause) for non-trivial recommendations. Offer one preferred solution; optionally a lightweight alternative.

---
If new subsystems are added (e.g., `mobile/`, `worker/`), create a new `*.instructions.md` with `applyTo` globs instead of bloating this file.