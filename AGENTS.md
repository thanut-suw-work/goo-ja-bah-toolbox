# AGENTS.md — GJB Toolbox

Instructions for humans and coding agents working in this repo.

## What this is

**GJB Toolbox** — fast CSR webapp of browser utilities. Runs entirely on the user’s machine. No backend. No analytics. No user-data collection. No `localStorage` / `sessionStorage` / IndexedDB. Refresh clears all tool state.

## Before you implement anything

1. Read **`docs/README.md`** (agent index).
2. Open only the docs it lists for your task (architecture, privacy, feature file).
3. Follow the approved design: `docs/superpowers/specs/2026-08-05-gjb-toolbox-design.md`.
4. For UI / visual work: use **Impeccable** (Operate mode). Run Impeccable context; honor repo-root `PRODUCT.md` / `DESIGN.md`. Do not invent a parallel design system.

## Hard rules

- Client-side only. Do not add APIs, auth, telemetry, or remote logging.
- Do not add browser persistence for tool input/output. Theme preference may be stored only as `localStorage['gjb-theme']` (`dark` | `light` | `system`). Nothing else.
- New tool = feature doc under `docs/features/` + registry entry + `src/tools/<id>/` + mirrored tests under `testing/unit/`.
- Tests live under root `testing/` and **mirror** `src/` (unit) / user flows (e2e). See `testing/README.md`.
- Keep changes scoped. Update docs when behavior or architecture changes.

## Stack (locked)

React + Vite + TypeScript · react-router · Vitest · Playwright · pdf.js for PDF tool only (lazy).

## Useful paths

| Path | Why |
|------|-----|
| `docs/README.md` | Which docs to read for which task |
| `docs/architecture.md` | Shell, router, registry |
| `docs/privacy.md` | Privacy constraints |
| `docs/features/` | Per-tool / subsystem specs |
| `testing/README.md` | How to test |
| `PRODUCT.md`, `DESIGN.md` | Impeccable product + visual reference (repo root) |
| User-level Cursor rules | Cross-project agent gotchas (e.g. sandbox netns) |
