# Dependency Update Plan (Electron + React + TypeScript)

## Scope and guardrails
- Goal: modernize and stabilize the build chain first, with no feature work and no intended runtime behavior changes.
- Approach: small, reviewable commits per phase; minimum viable config changes; preserve file structure unless compatibility requires otherwise.
- Constraint observed in this environment: registry access returns HTTP 403, so vulnerability/outdated checks are based on static config inspection plus known deprecations.

## Current stack inventory

### Package/runtime baseline
- Runtime: Electron `^11.0.1`, React/ReactDOM `^17.0.1`, React Router DOM `^5.2.0`, electron-updater `^4.3.4`, node-fetch `^2.6.1`.
- Build: Webpack `^5.5.1`, webpack-cli `^4.2.0`, webpack-dev-server `^3.11.0`, Babel 7.12-era preset/plugin stack.
- TypeScript: `^4.0.5`, `@types/node` 14, React 16/17 mixed type packages.
- Test/Lint: Jest 26, ESLint 7 + `babel-eslint`, Prettier 2, Enzyme + React-16 adapter.
- Packaging: electron-builder `^22.3.6` embedded in root `package.json` `build` block; app directory is `src/`.

### Config and script inventory
- TypeScript config: `tsconfig.json` targets `ES2018`, `module: CommonJS`, `jsx: react`, strict mode enabled.
- Webpack configs: `.erb/configs/webpack.config.*` (base, main prod, renderer prod/dev, DLL dev).
- Build scripts (root): `build`, `build:main`, `build:renderer`, `start`, `start:main`, `start:renderer`, `package`, `postinstall`, `build-dll`, `lint`, `test`.
- Electron builder config: root `package.json` `build` section with mac/win/linux targets and notarization hook.
- Packaged app manifest: `src/package.json` with `main: ./main.prod.js`.

## Deprecated, vulnerable-risk, and redundant dependency findings

### Known deprecated/legacy packages (high confidence)
- `babel-eslint` is deprecated (superseded by `@babel/eslint-parser`).
- `url-loader` and `file-loader` are legacy for webpack 5 (Asset Modules should replace over time).
- `electron-rebuild` package is legacy naming (migrated ecosystem package is `@electron/rebuild`).
- Multiple Babel proposal plugins are historical and may be redundant depending on target Babel version/ECMAScript support.

### Vulnerability risk indicators (static assessment)
- Electron 11 is significantly old and likely carries unfixed Chromium/Node CVEs relative to current Electron LTS lines.
- Jest 26 / ESLint 7 / TypeScript 4.0-era toolchain likely pulls vulnerable transitive packages in modern advisories.
- `node-fetch@2` has had historical advisories in older ranges; re-check exact patched range during lockfile refresh.

### Redundant or cleanup candidates
- Duplicate lockfiles (`yarn.lock` and `src/yarn.lock`) increase drift risk; keep one canonical strategy.
- Webpack 5 + `file-loader`/`url-loader` can usually consolidate to native asset modules later (compatibility-gated).
- React test stack is split (React 17 app + Enzyme React-16 adapter types), increasing maintenance friction.

## Runtime vs devDependency separation (target corrections)
- Keep in `dependencies` (runtime): Electron runtime helpers (`electron-log`, `electron-updater`, `source-map-support`), React app packages, routing/history, UI libs.
- Keep in `devDependencies` (build/test only): electron-builder, webpack/babel/typescript/eslint/jest/prettier/tooling packages, type packages.
- Review `electron-debug` placement in Phase 1/2: if used only in dev bootstrap, move to `devDependencies`; if required in packaged runtime, keep in `dependencies`.

## Phased execution plan (ordered)

### Phase 1 — package.json audit (execute now)
- **Files changed:** `docs/dependency-update-plan.md` — records inventory, risk findings, dependency classification targets, and exact next phases without behavior changes.
- Actions:
  - Freeze a baseline inventory of scripts/config/dependency topology.
  - Document deprecated/redundant packages and runtime-vs-dev intended corrections.
  - Keep source and behavior unchanged.

### Phase 2 — lockfile reset
- **Files changed:** `yarn.lock` (and remove `src/yarn.lock` if confirmed obsolete) — regenerate a single canonical lockfile to reduce drift and reproducibly apply audited versions.

### Phase 3 — toolchain update
- **Files changed:** `package.json`, `.erb/configs/webpack.config.*`, optional `.babelrc`/eslint parser settings — update webpack/dev-server/babel/eslint parser compatibility with minimal config edits.

### Phase 4 — electron update
- **Files changed:** `package.json`, `.erb/scripts/*` only if required — raise Electron/electron-builder/rebuild stack and adjust only incompatible build hooks.

### Phase 5 — react/typescript compatibility pass
- **Files changed:** `package.json`, `tsconfig.json`, minimal type-related config files — align TypeScript + React + `@types/*` versions and remove mixed-version typing conflicts.

### Phase 6 — build/dev script fix
- **Files changed:** `package.json` scripts only — patch broken command invocations after upgrades without altering app logic.

### Phase 7 — lint/test cleanup
- **Files changed:** lint/test config and package entries (e.g., eslint/jest config blocks) — resolve tooling breakages introduced by upgrades while preserving test intent.

### Phase 8 — manual app verification
- **Files changed:** none expected — run packaged/dev smoke checks and record results.

### Phase 9 — feature work (explicitly deferred)
- **Files changed:** none in this branch per request — do not mix hotkey or feature changes until dependency stabilization completes.

## Phase 1 execution log (this change)
- Completed: inventory and phased modernization plan created.
- Not started: lockfile reset, toolchain upgrades, Electron/React/TypeScript upgrades, lint/test cleanup.
