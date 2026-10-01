# AnimeAV1 API

> Unofficial API for scraping AnimeAV1 data (SvelteKit site)

## npm Package

```bash
npm install animeav1-api
```

## API

```typescript
import { getAnime, getCatalog, searchAnime, getEpisode } from 'animeav1-api';
```

## Functions

- `getAnime(slug)` - Anime details from /media/:slug page
- `getCatalog(params)` - Catalog listing with filters
- `searchAnime(query)` - Search by title
- `getEpisode(slug, number)` - Episode with mirrors and downloads

## Tech Notes

- Site is SvelteKit - data embedded in `kit.start()` call as JS object
- Scraping: fetch HTML, extract `data: [...]` array, convert to JSON
- Poster/backdrop URLs: `https://cdn.animeav1.com/{covers,backdrops}/{id}.jpg`
- Synopsis: cleaned (quotes, newlines normalized)
- Status: 0=Finished, 1=Upcoming, 2=Airing

## Disclaimer

This package is not affiliated with AnimeAV1. Use at your own risk.

---

# SDD Workflow & Agents

## Core rule

This project follows an ATL/SDD workflow:

explore → propose → spec → design → tasks → apply → verify → archive

The orchestrator coordinates the workflow.
The orchestrator must delegate real work to the correct SDD phase agent or support specialist.

Support agents must not replace the main SDD phases.

---

## Main SDD phases

### @sdd-explore
Use for initial investigation, codebase reading, context discovery, constraints, dependencies and existing patterns.

### @sdd-propose
Use to propose the implementation approach, alternatives, tradeoffs and recommended path.

### @sdd-spec
Use to write precise requirements, acceptance criteria, expected behavior and constraints.

### @sdd-design
Use to define architecture, technical decisions, interfaces, data flow and implementation strategy.

### @sdd-tasks
Use to break the approved design into ordered, executable tasks.

### @sdd-apply
Use to implement the approved tasks.
Do not delegate from this agent.
Keep changes focused and aligned with spec/design.

### @sdd-verify
Use to validate implementation against spec, design and expected behavior.
Do not implement new features here unless explicitly requested.

### @sdd-archive
Use to summarize final changes, decisions, verification results and pending items.

---

## Support agents

### @sdd-ui-review
Use when there is a screenshot, visual bug, responsive issue, layout problem, spacing problem, CSS/Tailwind issue, visual hierarchy issue, or visual fidelity comparison.

Expected output:
- visual diagnosis
- likely cause
- concrete frontend/UI recommendations
- suggested files/components to inspect

Do not apply code changes unless explicitly requested.

---

### @sdd-bug-hunter
Use when implemented code fails, regressions appear, logs are suspicious, or a bug is hard to reproduce.

Expected output:
- likely root cause
- reproduction clues
- risky areas
- focused fix plan

Avoid broad rewrites.

---

### @sdd-contract-check
Use when changes affect API contracts, DTOs, schemas, props, validation, serialization, frontend/backend compatibility, request/response shape, or typing.

Expected output:
- contract mismatches
- compatibility risks
- exact corrective actions

Do not redesign the feature.

---

### @sdd-test-writer
Use after apply or before verify when tests are needed.

Expected output:
- unit tests
- integration tests
- mocks/fixtures
- edge cases
- regression coverage

Prefer pragmatic, maintainable coverage.

---

### @sdd-code-review
Use for larger changes, risky refactors, architecture-sensitive edits, or final technical review before archive.

Expected output:
- maintainability issues
- readability issues
- risk areas
- technical debt
- concrete improvement suggestions

Do not apply changes directly unless explicitly requested.

---

## Delegation rules

If the user provides a screenshot or image related to frontend/UI, delegate first to @sdd-ui-review, then continue with @sdd-apply or @sdd-verify.

If implementation fails or a regression appears, delegate to @sdd-bug-hunter.

If the change touches interfaces between layers, delegate to @sdd-contract-check.

If tests are missing or weak, delegate to @sdd-test-writer.

If the change is large or risky, delegate to @sdd-code-review before archive.

Only the orchestrator should delegate to support agents.
Phase agents should complete their assigned work and return results to the orchestrator.
