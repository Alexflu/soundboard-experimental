# Dependency Modernization Plan (Electron + React + TypeScript)

## Objective
Modernize and stabilize the build system first while preserving current app behavior and file structure, then track and restore any behavior regressions introduced during modernization in a dedicated restoration phase.

## Constraints and operating rules
- Keep changes minimal and reviewable; avoid rewrites and unrelated refactors.
- Do not intentionally change runtime behavior.
- If modernization introduces regressions, log them and continue unless they block further progress.
- Use small commits grouped by phase.
- Execute phases sequentially and log blockers immediately when they prevent dependency resolution.

## Current stack inventory

### App/runtime baseline (`package.json`)
- Electron runtime: `electron@^11.0.1`, `electron-updater@^4.3.4`, `electron-log@^4.2.4`.
- UI/runtime: `react@^17.0.1`, `react-dom@^17.0.1`, `react-router-dom@^5.2.0`, `history@^5.0.0`.
- Other runtime libs: `node-fetch@^2.6.1`, `react-select@^4.0.2`, `react-toastify@^7.0.3`, `react-icons@^4.1.0`, `source-map-support@^0.5.19`.

### Tooling/build baseline (`package.json` + webpack configs)
- Webpack chain: `webpack@^5.5.1`, `webpack-cli@^4.2.0`, `webpack-dev-server@^3.11.0`, `webpack-merge@^5.4.0`.
- Babel chain: pinned to 7.12-era preset/plugin set plus many proposal plugins.
- TS/lint/test: `typescript@^4.0.5`, `eslint@^7.5.0`, `jest@^26.1.0`, `prettier@^2.0.5`.
- Packaging: `electron-builder@^22.3.6` in root `build` config.

### TypeScript and compiler config (`tsconfig.json`)
- `target: ES2018`, `module: CommonJS`, `jsx: react`, `strict: true`, `noEmit: true`.
- Extra checks enabled (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`).

### Electron packaging / app manifest
- Builder config is embedded in root `package.json` (`build` object: mac/win/linux targets, output `release/`, app dir `src`).
- Packaged app manifest at `src/package.json` (`main: ./main.prod.js`).

### Scripts inventory (root `package.json`)
- Build/start: `build`, `build:main`, `build:renderer`, `start`, `start:main`, `start:renderer`, `build-dll`.
- Maintenance: `lint`, `test`, `rebuild`, `postinstall`, `package`.

## Dependency risk audit (Phase 1 findings)

### Deprecated / legacy indicators
- `babel-eslint` is deprecated (modern replacement: `@babel/eslint-parser`).
- `file-loader` and `url-loader` are legacy in webpack 5-era setups.
- `electron-rebuild` is legacy package naming; ecosystem moved to `@electron/rebuild`.
- Enzyme stack is old and tied to React 16 adapter packages, while app runtime is React 17.

### Likely vulnerable-outdated areas (static assessment)
- Electron 11, Jest 26, ESLint 7, and TypeScript 4.0 are significantly behind current maintained lines.
- `node-fetch@2` and legacy transitive tree should be revalidated during lockfile/toolchain phases.

### Redundant / drift risks
- Two lockfiles exist (`yarn.lock` and `src/yarn.lock`), increasing dependency drift risk.
- Very large Babel proposal plugin surface likely includes plugins no longer needed after toolchain refresh.

### Runtime vs devDependency separation targets
- Keep runtime-critical in `dependencies`: `electron-log`, `electron-updater`, `source-map-support`, React/router/UI libs, fetch/history.
- Keep build/test-only in `devDependencies`: webpack/babel/typescript/eslint/jest/prettier/types/electron-builder.
- Validate `electron-debug` usage in startup path; move to `devDependencies` if confirmed dev-only.

## Command-based audit status
- `yarn npm audit --all --recursive` fails with HTTP 403 in this environment, so vulnerability analysis is static for Phase 1.
- `npm view` registry queries also fail with HTTP 403, so latest-version checks are deferred to lockfile/toolchain execution environment.

## Phased execution plan

| Phase | Goal | Files planned to change (exact) | Why (one sentence each) |
|---|---|---|---|
| 1. package.json audit (**executed now**) | Baseline inventory + risk map | `docs/dependency-update-plan.md` | Captures current stack, deprecated/vulnerability-risk findings, and exact phase plan before edits. |
|  |  | `docs/modernization-regression-log.md` | Adds a running ledger to record modernization regressions, causes, and restoration actions. |
| 2. lockfile reset | Single canonical lock + deterministic graph | `yarn.lock` | Regenerates one lockfile after dependency decisions to stabilize installs. |
|  |  | `src/yarn.lock` (delete if unused) | Removes duplicate lock source to prevent drift between root and app dir. |
| 3. toolchain update | Modernize build chain first | `package.json` | Updates webpack/babel/builder-adjacent tooling versions with minimal script impact. |
|  |  | `.erb/configs/webpack.config.base.js` | Applies minimal compatibility updates required by upgraded loader/plugin behavior. |
|  |  | `.erb/configs/webpack.config.renderer.dev.babel.js` | Adjusts dev-server/runtime integration only where required by updated tooling APIs. |
|  |  | `.erb/configs/webpack.config.renderer.prod.babel.js` | Preserves production output while updating build-plugin compatibility settings. |
|  |  | `.erb/configs/webpack.config.main.prod.babel.js` | Keeps main-process bundle behavior stable while aligning with updated minimizer/plugin defaults. |
| 4. electron update | Raise Electron + packager safely | `package.json` | Upgrades Electron/electron-builder/rebuild dependencies and engine constraints as needed. |
|  |  | `.erb/scripts/CheckNativeDep.js` (if required) | Applies only compatibility fixes needed for changed native rebuild/electron APIs. |
|  |  | `src/package.json` (if required) | Adjusts packaged app metadata only if Electron/builder upgrade requires it. |
| 5. react/typescript compatibility pass | Align React + TS + type packages | `package.json` | Synchronizes React/TypeScript and `@types/*` ranges to a compatible supported set. |
|  |  | `tsconfig.json` | Applies minimal compiler-option updates needed by newer TypeScript and JSX handling. |
| 6. build/dev script fix | Repair scripts broken by upgrades | `package.json` | Updates scripts with smallest command changes for reliable dev/build/package flow. |
| 7. lint/test cleanup | Restore lint/test stability post-upgrades | `package.json` | Updates lint/test dependencies and commands only where modernization broke execution. |
|  |  | `src/App.test.tsx` (only if required) | Performs minimal test compatibility fixes when tooling/API upgrades break existing tests. |
| 8. manual app verification | Smoke-check behavior after modernization | `docs/modernization-regression-log.md` | Records verified flows, observed regressions, and whether they block continuation. |
| 9. regression restoration pass | Recover behavior changes introduced by modernization | `docs/modernization-regression-log.md` | Closes logged regressions with restoration status and links to minimal corrective changes. |
|  |  | *targeted source/config files based on logged regressions only* | Limits restoration edits strictly to impacted areas to avoid scope expansion. |

## Phase execution status
- ✅ Phase 1 completed: package/config audit and plan baseline.
- ⚠️ Phase 2 partially completed: removed duplicate `src/yarn.lock`, but root lockfile regeneration is blocked by package registry HTTP 403 errors during `yarn install`.
- ⚠️ Phase 3 blocked: toolchain version upgrades cannot be resolved or validated without registry access.
- ⚠️ Phase 4 blocked: electron/electron-builder upgrades cannot be downloaded or validated without registry access.
- ⚠️ Phase 5 blocked: React/TypeScript compatibility upgrades cannot be installed to run compile checks.
- ⚠️ Phase 6 blocked: script fixes cannot be validated against upgraded tools because upgrades are blocked upstream.
- ⚠️ Phase 7 blocked: lint/test modernization cannot proceed until updated dependencies are installable.
- ⚠️ Phase 8 completed with blockers: manual verification commands were run, but build/test are blocked by unresolved Yarn lockfile state tied to registry access restrictions.
- ⚠️ Phase 9 attempted: restoration pass cannot proceed because all open regressions are dependency-resolution blockers caused by registry access restrictions.
