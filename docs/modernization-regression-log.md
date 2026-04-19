# Modernization Regression Log

Tracks behavior regressions found during dependency modernization. Regressions are logged and restored in Phase 9 unless they block forward progress.

## Status legend
- `Open`: observed, not yet restored.
- `Blocked`: blocks next modernization step and needs immediate fix.
- `Restored`: behavior restored with minimal targeted change.

## Entries

| ID | Phase found | Area | Symptoms | Suspected cause | Blocking? | Planned restoration step | Status |
|---|---|---|---|---|---|---|---|
| BLK-001 | 2 | Dependency resolution | `yarn install --mode=skip-build` fails with HTTP 403, preventing lockfile regeneration and any dependency upgrades. | Registry/network policy denies package metadata/artifact access. | Yes | Run phases 2-7 in an environment with npm registry access, then regenerate lockfile and continue upgrades. | Blocked |
| BLK-002 | 3 | Toolchain upgrade | Unable to fetch updated webpack/babel/eslint packages to perform Phase 3 upgrades. | Same registry HTTP 403 restriction as BLK-001. | Yes | Unblock package registry access, then run dependency upgrades and lockfile refresh. | Blocked |
| BLK-003 | 4 | Electron upgrade | Electron, electron-builder, and rebuild package updates cannot be installed. | Same registry HTTP 403 restriction as BLK-001. | Yes | Restore registry access, then upgrade Electron stack and rerun packaging checks. | Blocked |
| BLK-004 | 5 | React/TypeScript pass | Cannot install upgraded React/TypeScript/type packages, so compatibility pass cannot execute. | Same registry HTTP 403 restriction as BLK-001. | Yes | Unblock registry, install updated packages, and run typecheck/build before continuing. | Blocked |
| BLK-005 | 6 | Build/dev scripts | Script compatibility fixes are deferred because required upgraded binaries are unavailable. | Same registry HTTP 403 restriction as BLK-001. | Yes | After registry access is restored and upgrades land, run and fix build/dev scripts. | Blocked |
| BLK-006 | 7 | Lint/test cleanup | Lint/test dependency updates and cleanup cannot run without successful package resolution. | Same registry HTTP 403 restriction as BLK-001. | Yes | Restore registry connectivity, install upgrades, then execute lint/test cleanup tasks. | Blocked |
| BLK-007 | 8 | Manual verification | `npm run build` fails because underlying scripts call Yarn and lockfile cannot be repaired without registry access; `npm run test` also fails because build artifacts are missing. | Upstream dependency-resolution blocker prevents producing required build artifacts. | Yes | Restore registry access, run install/build successfully, then re-run test/manual verification. | Blocked |
| BLK-008 | 9 | Regression restoration | Restoration pass could not close open items because each depends on unresolved package installation and lockfile regeneration. | BLK-001 remains unresolved and blocks all downstream restoration work. | Yes | First unblock registry and rerun Phases 2-8; then close each blocker with validated fixes. | Blocked |

## Baseline notes (Phase 1)
- No runtime behavior was intentionally changed in Phase 1.
- This phase only added planning/audit documentation.

## Phase completion notes
- Phase 9 executed as a restoration checkpoint, but no blocked regression could be closed without registry access.
