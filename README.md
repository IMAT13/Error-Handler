# Error Handler Package

## Overview

`error-handler` provides a unified way to create, classify, and surface errors across applications. It delivers:

- A structured `AppError` model with localized messages, breadcrumbs, and metadata.
- A fluent builder for assembling rich error objects.
- A factory layer with sensible defaults for common error domains (network, validation, mapping, and more).
- A Vue plugin that centralizes browser and component error capture.

Use it to guarantee consistent user messaging while preserving enough diagnostic context for developers and support teams.

## Getting Started

### Creating Errors with Factories

Each factory method ships with default codes, messages, and metadata. Override only what you need:

```js
import { AppError } from "@packages/error-handler";

try {
  await httpClient.get("/api/profile");
} catch (error) {
  throw AppError.network({
    metadata: { url: "/api/profile", method: "GET", status: error.response?.status },
    retryCount: 2,
  });
}
```

Available factory shortcuts:

- `AppError.network(options)`
- `AppError.validation(options)`
- `AppError.mapping(options)`
- `AppError.permission(options)`
- `AppError.component(options)`
- `AppError.environment(options)`
- `AppError.system(options)`
- `AppError.unknown(options)`
- `AppError.feature(options)`

Common `options` include `messages`, `reason`, `metadata`, `breadcrumbs`, `causes`, and more. All fields are optional—the factory fills gaps with localized defaults.

### Building Custom Errors

For advanced scenarios, assemble errors with the builder to opt into everything on demand:

```js
import { createAppErrorBuilder, AppError } from "@packages/error-handler";

const error = createAppErrorBuilder({ code: "PAYMENT_TIMEOUT", type: AppError.Types.NETWORK })
  .withLevel(AppError.Levels.ERROR)
  .withMessages({ user: { en: "Payment timed out" } })
  .withMetadata({ orderId: "ORD-123", attempt: 3 })
  .withBreadcrumbs([{ message: "Payment screen rendered", timestamp: Date.now() - 1000 }])
  .withOriginalError(new Error("request aborted"))
  .build();

throw error;
```

### Inspecting Errors

`AppError` instances are immutable. You can safely serialize them or log a concise summary:

```js
console.log(error.toString());
// AppError(PAYMENT_TIMEOUT): Payment timed out

logger.error(error.toJSON());
// { name, code, type, level, messages, metadata, breadcrumbs, ... }
```

### Using the Vue Plugin

The Vue plugin captures unhandled rejections, global errors, resource load failures, and Vue component exceptions, forwarding each through the `AppError` pipeline.

```js
import { createApp } from "vue";
import { errorHandlerPlugin, AppError } from "@packages/error-handler";

const app = createApp(App);

app.use(
  errorHandlerPlugin({
    onError(appError) {
      // Central logging / telemetry
      telemetry.capture(appError.toJSON());
    },
    messages: {
      unhandledRejection: "A background task failed",
      vueError: "Something went wrong in the UI",
    },
    capture: {
      resourceError: true,
      vueError: true,
    },
    preventDefault: {
      globalError: false,
      resourceError: true,
    },
  }),
);
```

#### Plugin Options

- `onError(appError)` (default: logs to console in dev): handle every `AppError` emitted by the plugin.
- `messages`: override user-facing messages per capture type (`unhandledRejection`, `rejectionHandled`, `resourceLoad`, `uncaughtException`, `vueError`).
- `capture`: enable/disable specific listeners (`unhandledRejection`, `rejectionHandled`, `globalError`, `resourceError`, `vueError`).
- `preventDefault`: either a boolean or an object to fine-tune `event.preventDefault()` behavior for each listener.

### Customizing Messages and Localization

Messages can be:

- Plain strings (mirrored to both `fa` and `en`).
- Objects with `{ fa, en }`.
- Partially localized objects—the library fills missing locales from fallbacks.

Set `messages.original` when you want a different value for logs vs. user interfaces.

### Breadcrumbs, Metadata, and Causes

- **Breadcrumbs**: arrays of strings or objects with `message`, `category`, `level`, `data`, and `timestamp`. They help reconstruct execution flow.
- **Metadata**: any serializable key/value data. Factories attach domain-specific metadata automatically (e.g. HTTP status for network errors).
- **Causes**: other errors or primitives. Native `Error` instances are wrapped to avoid losing stack traces.

### Best Practices

- Propagate `AppError` instances across async boundaries; consumers can detect them with `AppError.isAppError(value)`.
- Provide user-safe messages via `messages.user` and keep sensitive data inside `metadata` or `messages.original`.
- Capture underlying errors with `originalError` to retain stack traces.
- Use the builder for reusable error templates in your domain layer.

## Support & Troubleshooting

- When in doubt, `error.toJSON()` is the easiest way to inspect the full error payload.
- Ensure the Vue plugin is registered before other plugins that depend on error handling.
- Wrap third-party failures (e.g. payments, auth) with the closest matching factory to retain shared semantics across teams.
