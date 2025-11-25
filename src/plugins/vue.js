import { AppError } from "../app-error.js";

const defaultOnError = (error) => {
  if (import.meta?.env?.DEV) console.error("[error-handler] Captured unhandled error:", error.toJSON());
};

const toBooleanMap = (value, defaults) => {
  if (typeof value === "boolean") {
    const map = {};
    for (const key of Object.keys(defaults)) {
      map[key] = value;
    }
    return map;
  }
  return {
    ...defaults,
    ...(value ?? {}),
  };
};

export const errorHandlerPlugin = (options = {}) => {
  const {
    onError = defaultOnError,
    messages: messageOverrides = {},
    capture: captureConfig = {},
    preventDefault: preventDefaultConfig,
  } = options;

  const capture = {
    unhandledRejection: true,
    rejectionHandled: true,
    globalError: true,
    resourceError: true,
    vueError: true,
    ...captureConfig,
  };

  const preventDefault = toBooleanMap(preventDefaultConfig, {
    unhandledRejection: true,
    rejectionHandled: false,
    globalError: true,
    resourceError: false,
    vueError: false,
  });

  const getMessages = (key) => messageOverrides?.[key];

  const handleUnknownError = (payload) => {
    const appError = AppError.unknown(payload);
    onError(appError);
  };

  const isBrowser = typeof window !== "undefined";

  return {
    install(app) {
      if (capture.unhandledRejection && isBrowser) {
        window.addEventListener("unhandledrejection", (event) => {
          const originalError = event.reason instanceof Error ? event.reason : undefined;
          const reason =
            originalError?.message ?? (typeof event.reason === "string" ? event.reason : undefined);

          handleUnknownError({
            code: "UNHANDLED_REJECTION",
            messages: getMessages("unhandledRejection"),
            originalError,
            reason,
            metadata: {
              scope: "global",
              source: "window",
              eventType: event.type,
              isTrusted: event.isTrusted ?? null,
              stack: originalError?.stack ?? null,
            },
            causes: event.reason != null ? [event.reason] : undefined,
          });

          if (preventDefault.unhandledRejection) {
            event.preventDefault?.();
          }
        });
      }

      if (capture.rejectionHandled && isBrowser) {
        window.addEventListener("rejectionhandled", (event) => {
          const originalError = event.reason instanceof Error ? event.reason : undefined;
          const reason =
            originalError?.message ?? (typeof event.reason === "string" ? event.reason : undefined);

          handleUnknownError({
            code: "REJECTION_HANDLED",
            messages: getMessages("rejectionHandled"),
            originalError,
            reason,
            metadata: {
              scope: "global",
              source: "window",
              eventType: event.type,
              isTrusted: event.isTrusted ?? null,
            },
            causes: event.reason != null ? [event.reason] : undefined,
          });

          if (preventDefault.rejectionHandled) {
            event.preventDefault?.();
          }
        });
      }

      if (isBrowser && capture.resourceError) {
        window.addEventListener(
          "error",
          (event) => {
            const target = event.target;
            const isResource =
              target &&
              target !== window &&
              "tagName" in target &&
              ["IMG", "SCRIPT", "LINK", "VIDEO", "AUDIO"].includes(target.tagName);

            if (!isResource) return;

            const descriptor =
              target.tagName === "IMG" ? target.currentSrc || target.src : target.src || target.href;

            const originalError = event.error instanceof Error ? event.error : undefined;

            handleUnknownError({
              code: "RESOURCE_LOAD_ERROR",
              messages: getMessages("resourceLoad"),
              originalError,
              reason: originalError?.message ?? undefined,
              metadata: {
                scope: "global",
                source: "resource",
                tagName: target.tagName,
                descriptor: descriptor ?? null,
              },
              causes: originalError ? [originalError] : undefined,
            });

            if (preventDefault.resourceError) {
              event.preventDefault?.();
            }
          },
          true,
        );
      }

      if (capture.globalError && isBrowser) {
        window.addEventListener("error", (event) => {
          if (capture.resourceError && event.target && event.target !== window && "tagName" in event.target) {
            return;
          }

          const originalError = event.error instanceof Error ? event.error : undefined;
          const reason =
            originalError?.message ?? (typeof event.message === "string" ? event.message : undefined);

          handleUnknownError({
            code: "UNCAUGHT_EXCEPTION",
            messages: getMessages("uncaughtException"),
            originalError,
            reason,
            metadata: {
              scope: "global",
              source: "window",
              filename: event.filename ?? null,
              lineno: event.lineno ?? null,
              colno: event.colno ?? null,
            },
            causes: originalError ? [originalError] : undefined,
          });

          if (preventDefault.globalError) {
            event.preventDefault?.();
          }
        });
      }

      if (capture.vueError !== false) {
        const previousHandler = app.config.errorHandler;

        app.config.errorHandler = (error, instance, info) => {
          const originalError = error instanceof Error ? error : undefined;

          handleUnknownError({
            code: "VUE_COMPONENT_ERROR",
            messages: getMessages("vueError"),
            originalError,
            reason: originalError?.message ?? undefined,
            metadata: {
              scope: "vue",
              info: info ?? null,
              componentName: instance?.type?.name ?? instance?.type?.__name ?? null,
            },
            service: {
              name: "vue",
              method: info ?? null,
              operation: "component-error",
            },
            causes: originalError ? [originalError] : undefined,
          });

          if (typeof previousHandler === "function") {
            previousHandler(error, instance, info);
          }
        };
      }
    },
  };
};
