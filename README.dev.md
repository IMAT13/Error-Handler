# Developer Guide – Error Handler Package

This document explains how the `error-handler` module is organized, how the pieces interact, and how to work effectively on the package.

## High-Level Architecture

```
packages/error-handler
├── index.js                  # Public entry point (re-exported API surface)
├── src
│   ├── app-error.js          # Core immutable AppError class
│   ├── app-error.builder.js  # Fluent builder for assembling AppError instances
│   ├── constants.js          # Error types, levels, default messages
│   ├── helpers
│   │   └── factories.js      # Typed factory helpers (network, validation, etc.)
│   ├── plugins
│   │   └── vue.js            # Vue plugin wiring browser + component errors
│   └── utils
│       ├── deep-merge.js     # Controlled deep merge helper for metadata
│       └── localization.js   # Utilities for localized message objects
├── tests                     # Vitest suites for every module
└── README*.md                # Customer + developer documentation
```

### Module Responsibilities

| Module                  | Responsibility                                                                                                      | Key collaborators                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `app-error.js`          | Defines the immutable `AppError` class, message normalization, breadcrumb/cause handling, JSON/string serialization | `constants.js`, `utils/localization.js`                                        |
| `app-error.builder.js`  | Fluent API for constructing `AppError` instances safely                                                             | `app-error.js`, `constants.js`, `utils/deep-merge.js`, `utils/localization.js` |
| `helpers/factories.js`  | Factory shortcuts that encapsulate defaults per error type                                                          | `app-error.builder.js`, `constants.js`, `utils/localization.js`                |
| `plugins/vue.js`        | Vue plugin capturing browser + Vue errors and forwarding via `AppError.unknown`                                     | `app-error.js` (via entry re-export), browser events                           |
| `utils/localization.js` | Normalizes localized message payloads, clones defaults                                                              | Used throughout normalization paths                                            |
| `utils/deep-merge.js`   | Deterministic merge for metadata while preserving immutability                                                      | Used by builder and factories                                                  |
| `index.js`              | Exposes the public surface (`AppError`, factories, builder, Vue plugin)                                             | Re-exports everything above                                                    |

### Execution Flow Overview

1. **Consumers** normally create errors through `AppError.<type>()` factories.
2. Factories construct a builder via `createAppErrorBuilder`, apply shared options, and enrich metadata.
3. Builders compose message localization, metadata merging, arrays (breadcrumbs/causes/descriptions), timestamps, and return a frozen `AppError` instance.
4. The `AppError` constructor finalizes normalization (message, breadcrumbs, causes, stack assignment) and ensures immutability.
5. Vue plugin captures runtime events and channels them through `AppError.unknown`, allowing the consumer-supplied `onError` handler to centralize telemetry.

## Developing Locally

### Test Suite

Vitest is configured at the workspace root. Run only the error-handler tests or the full suite:

```bash
# Entire workspace test run (fast)
pnpm vitest run

# With coverage (used in CI to enforce quality)
pnpm vitest run --coverage
```

> A dedicated test directory under `error-handler/tests` mirrors the runtime modules. Tests are written in ESM and maintain 100 % statement + line coverage for the package.

## Working With the Modules

### `AppError`

Key normalization steps to keep in mind when editing:

- Messages: strings and partial locale objects are normalized to `{ fa, en }`, with fallbacks from defaults (`constants.js`).
- Breadcrumbs: coerced via `toArray`, strings transformed to frozen breadcrumb objects, invalid entries filtered out.
- Causes: existing `AppError` instances pass through, `Error` instances are wrapped (name, message, stack), objects with `message` are localized, everything else is returned as-is.
- Stack: explicit `stack` param wins; otherwise adopt `originalError.stack` if available, fallback to `Error.captureStackTrace` (or a new `Error().stack` on platforms without it).

### `createAppErrorBuilder`

- Maintains an internal mutable `state` object; `build()` hydrates an `AppError` and freezes it.
- `withMetadata` uses `deepMerge` so nested objects accumulate rather than overwrite.
- Array-ish setters (`withDescriptions`, `withBreadcrumbs`, `withCauses`) rely on `ensureArray`—be careful to keep new inputs consistent with runtime expectations.

### `helpers/factories`

- Each helper is thin: configure builder, normalize domain-specific metadata, and call `build()`.
- Shared logic for message overrides lives in `cloneTypeMessages` + `applyCommonOptions`.
- When adding a new factory, plug it into `ErrorFactory` export and expose a static on `AppError` via `index.js`.

### `plugins/vue.js`

- Listeners are only installed when the environment supports `window`.
- `preventDefault` config accepts either boolean (apply to all) or an object mirroring the capture keys.
- Every listener constructs an `AppError.unknown` with scoped metadata and calls `onError`.
- When updating event wiring, update the tests in `tests/plugins.vue.test.js` to preserve coverage.

## Testing Strategy

- Every exported function/class has direct test coverage.
- Vue plugin tests stub `window.addEventListener`, environment variables, and console logging to validate behavior.
- When adding functionality, start by creating/expanding a matching test file. Example layout:
  - `tests/app-error.test.js`
  - `tests/app-error.builder.test.js`
  - `tests/helpers.factories.test.js`
  - `tests/plugins.vue.test.js`
  - `tests/utils.*.test.js`
  - `tests/index.test.js`

## Versioning & Release Notes

- Package follows semantic versioning through the workspace release process.
- Update both `README` files when you introduce features affecting consumers or internals.
- Include migration guidance in the customer README for breaking changes.

## Common Development Tasks

| Task                    | Command                                                     |
| ----------------------- | ----------------------------------------------------------- |
| Run tests               | `pnpm vitest run`                                           |
| Run tests with coverage | `pnpm vitest run --coverage`                                |
| Lint code               | `pnpm lint`                                                 |
| Update docs             | Edit `README.md` (consumer) and `README.dev.md` (developer) |

## Troubleshooting

- **Uncovered code**: run `pnpm vitest run --coverage` and inspect `coverage/coverage-final.json` or the HTML report under `coverage/`. Branch coverage may surface gaps in new logic.
- **Vue plugin issues**: ensure the plugin is installed once, before other global handlers, and that global stubs don’t interfere (particularly in unit tests).
- **Localization edge cases**: review `utils/localization.js` tests before altering fallback logic to maintain parity across modules.

## Contributing Guidelines

1. Open a branch per feature/fix.
2. Add or update tests alongside runtime changes.
3. Update documentation as needed.
4. Run the full Vitest suite + lint before opening a PR.
5. Document noteworthy changes in the workspace changelog (if applicable).

## Further Reading

- Customer-facing usage guide: [`README.md`](./README.md)
- Workspace conventions, CI configuration, and release steps live in the repository root documentation.
