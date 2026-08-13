# Submission checklist

Everything the brief asks for, and where it lives.

## Requirements

### 5.1 Data & queries

- [x] **Thoughtful graph data model** — 6 node labels, 11 relationship types, properties on both.
      Documented in [README §3](README.md#3-data-model) with a diagram, and rendered in-app at `#/model`.
- [x] **Diagram in the README** — Mermaid (renders natively on GitHub) + the annotated in-app version.
- [x] **Realistic seed data loaded by a script in the repo** — [`scripts/dataset.ts`](scripts/dataset.ts)
      (deterministic generator) + [`scripts/seed.ts`](scripts/seed.ts) (batched loader).
      1,153 nodes / 6,799 relationships.
- [x] **Multi-hop traversal (2+ hops)** — the warm-intro engine walks 1–5 hops across six
      relationship types (`server/cypher.ts` → `INTRO_PATH_QUERIES`). `investor.coInvestors` is 2 hops,
      `intro.recommend` is 4.
- [x] **A query a relational database would find awkward** — `conflicts.sameSector`: a six-hop
      pattern in one `MATCH`, versus a four-way self-join in SQL.
- [x] **Parameterised queries via the official Neo4j driver, no string-concatenated Cypher** —
      all statements are constants in [`server/cypher.ts`](server/cypher.ts); values are always
      bound `$parameters`. Verifiable live via the **Cypher** drawer on every screen.

### 5.2 Application & UI/UX

- [x] **Functional web app a non-technical person could use** — persona picker → pick a firm →
      ranked introduction routes written in plain English, with a copy-pasteable ask.
- [x] **Clean, intentional UI/UX** — one design system, a fixed colour per node kind used
      identically in badges, path chains and the graph canvas; skeleton loaders shaped like the
      content; empty states that offer the next action; keyboard-driven search (⌘K).
- [x] **Loading and empty states** — every screen routes through one `AsyncBoundary`.

### 5.3 Engineering

- [x] **Connection details from environment variables, never committed** —
      [`server/config.ts`](server/config.ts); `.env` is gitignored; `.env.example` is the template.
- [x] **Clear project structure** — `routes → services → cypher/db`, one module per domain concept.
- [x] **Graceful error handling when the database is unreachable** — `toApiError` translates driver
      failures into a small vocabulary with actionable hints; `/api/health` always answers 200 with a
      diagnosis; the UI distinguishes *not configured* / *unreachable* / *empty*.

### 6 Deliverables

- [x] **Full source code** — application, data-loading scripts, all Cypher.
- [x] **README** — use case, "Why a graph database?", data model diagram, setup instructions
      (including creating the CognoDB instance), the main queries explained.
- [ ] **Screenshots of the UI** — see [`docs/README.md`](docs/README.md) for the list of six.
- [ ] **Hosted demo link** *(mandatory)* — deploy per [README §8](README.md#8-deploying), then paste
      the URL into the table at the top of the README.
- [ ] **Short screen recording** *(mandatory)* — suggested script in [`docs/README.md`](docs/README.md).

## Before you submit

1. `npm run verify` passes against the live instance.
2. The hosted demo loads and the warm-intro flow works end to end.
3. The demo URL and recording link are pasted into the README table.
4. Screenshots are committed in `docs/`.
5. **Leave the CognoDB instance running** — the brief asks for it to stay up until you hear back.
6. If the repo is private, grant access as the brief requests.

## Email

> **To:** hr@wexa.ai
> **Subject:** CognoDB Assignment 2 – &lt;Your Name&gt;

Body: the repository URL and the demo link.
