# Modernization Assessment (current branch)

Date: 2026-04-23

## Key findings

- The project is in a mixed transitional state: modernized Electron/Webpack versions are present, but runtime code still relies on deprecated/removed Electron `remote` patterns and older tooling assumptions.
- Build currently succeeds (`yarn build`) but reports a real updater import warning.
- Lint and tests currently fail in ways consistent with modernization drift.

## Immediate blockers

1. Renderer uses `require('electron').remote` for global shortcuts and window controls; this is incompatible with current Electron expectations and likely breaks hotkeys and top-bar actions at runtime.
2. Main process imports `electron-updater` as a default export; Webpack reports there is no default export.
3. ESLint currently errors on modernized ESM-style imports in `src/main.dev.ts`.
4. Test setup requires built artifacts before running tests and references non-existent script names in error text.

## Suggested phased path

1. **Restore runtime behavior first**
   - Move shortcut and window APIs behind an IPC/preload boundary.
   - Replace `remote` renderer calls in `App.tsx`, `TopBarComponent.tsx`, and user preference path fallback.
2. **Fix updater and main-process compatibility**
   - Use named `autoUpdater` import from `electron-updater`.
   - Replace deprecated `new-window` event handling with `setWindowOpenHandler`.
3. **Stabilize developer workflow**
   - Align lint rules/import style expectations in `src/main.dev.ts` and ESLint config.
   - Update Jest setup so unit tests can run without requiring production bundles.
4. **Finish modernization alignment (small sweep)**
   - Remove legacy loaders/plugins and obsolete Babel proposal plugins not needed by source.
   - Normalize package manager artifacts and script naming/messages.

## Validation checkpoints

- Runtime checkpoint: `yarn start` and manual validation of top-bar buttons + hotkeys.
- Build checkpoint: `yarn build` with no warnings.
- Test checkpoint: `yarn test --runInBand` passing without prebuilt main/renderer requirement.
- Packaging checkpoint: `yarn package` completes for target environment.
