# Repository Archive

This folder contains files intentionally removed from the active application tree during the repository cleanup on 2026-08-16.

Baseline reviewed: `main` at `360dd56fda93920b4f721da4afd22eb0e318347b`.

## Why files are here

Archived files are retained for history and recovery, but they are not required by the current runtime, frontend build, CI test suite, or ordered backend migration runner.

### `legacy/frontend/`

Contains confirmed unused or superseded frontend files: Vite starter assets, the generic Vite template README, unused `App.css`, obsolete route guards, unused Admin UI primitives, and the old page-level `ChatWidget` implementation. The active application keeps `components/ChatWidget.tsx`, `MessageCenter`, `RoleProtectedRoute`, and `AdminProtectedRoute` in the normal source tree.

### `legacy/docs/`

Contains historical analysis, temporary handoff/status material, obsolete demo/testing notes, and superseded implementation notes. Current operational and requirements documentation remains under `docs/`.

### `legacy/sql/`

Contains dated one-off SQL migrations, hotfixes, seeds, and implementation batches from the pre-versioned migration period. They are kept for historical reference only and should not be applied to production as a migration sequence.

The active database bootstrap baseline remains `sql/db.sql`. Forward application migrations are in `backend/src/migrations` and are run by `npm run migrate` / backend startup.

## Safety rules

- Do not import application code from this archive.
- Do not run archived SQL against production without a separate review.
- Do not move active migration modules into this archive after they have been applied to a shared environment.
- Restore an archived file to its original location only after confirming it is still compatible with the current codebase.
