# CARE pressure sore plugin

An encounter/patient questionnaire group with the original CARE front and back body maps. Select a location, add a sore, and record dimensions, exudate, tissue type and notes. Multiple sores in a region remain independent rows. The same renderer displays stored answers and prints a text summary alongside the diagrams.

## Saved data

See [SCHEMA.md](SCHEMA.md) for fields, validation, empty/zero behavior, and a submitted result. The authoritative definition is `src/lib/group.ts`. The plugin uses CARE's ordinary questionnaire answers; it adds no backend endpoint.

## Local development

Keep this directory at `care_fe/apps/care_pressure_sore_fe`, run `npm ci` here, and start the host with `portless` (or `npm run dev` if unavailable). CARE discovers the manifest automatically. In the questionnaire builder, choose **Group → Pressure sore chart**. The builder can require at least one sore.

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

This directory is a standalone local Git repository, like Dental. The host ignores `apps/`; publish the plugin from this directory when ready.

## Remote build

Dental's Vite 6 federation setup is used, with scoped plain CSS and shared React/React DOM/react-i18next. Build output is `dist/assets/remoteEntry.js`, alongside the chunks, stylesheet, locale, and original SVGs. `npm run preview` serves it at port 4179. Production configuration must use slug `care_pressure_sore_fe` and the deployed remote entry URL. Local discovery is development-only.

Plugin-owned integration tests (run from the `care_fe` root using its installed Playwright runner):

```sh
CARE_PRESSURE_SORE_E2E=1 npx playwright test --config apps/care_pressure_sore_fe/playwright.config.ts
```

The suite and browser helper live in this plugin's `tests/` directory. They reuse CARE's generic test helpers and require the local backend, existing test fixtures, `tests/.auth/user.json` in the host, and a running host loading the plugin. This configuration does not start servers or reset the database.

The readback checks also need a Vite dev host. Set `CARE_GROUP_VALIDATION_URL` to its URL; to exercise the federated build, set `CARE_PRESSURE_SORE_REMOTE_URL=http://127.0.0.1:4179/assets/remoteEntry.js` while the preview server runs. The browser helper resolves React through Vite so it shares the host singleton.

## Original artwork

Recovered from `ohcnetwork/care_fe` commit `f066a3659beb2ba899a226a465b06922b2207d69` (2023-12-30):

- `public/images/pressure-sore-anterior.svg`: 21 regions.
- `public/images/pressure-sore-posterior.svg`: 19 regions.

Paths and transforms come from `src/Components/CriticalCareRecording/types/CriticalCare__PressureSore.res`, arrays `anteriorParts` and `posteriorParts`. The viewBox (`0 0 344.7 932.661`) comes from `CriticalCare__PressureSoreEditor.res` in the adjacent `PressureSore/` directory. Path IDs preserve the old persisted region codes.

`npm run generate` extracts the checked-in SVG geometry into `src/lib/bodyPaths.json` for React rendering. It also runs before builds. Edit the SVGs first; the generated JSON is not an independent source.
