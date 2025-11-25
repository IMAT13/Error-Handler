import { AppError } from "./app-error.js";
import { DEFAULT_LEVEL_BY_TYPE, DEFAULT_MESSAGES, ERROR_LEVELS, ERROR_TYPES } from "./constants.js";
import { deepMerge } from "./utils/deep-merge.js";
import { cloneLocalizedMessages, ensureLocalizedText } from "./utils/localization.js";

const VALID_TYPES = new Set(Object.values(ERROR_TYPES));
const VALID_LEVELS = new Set(Object.values(ERROR_LEVELS));

const assertCode = (code) => {
  if (typeof code !== "string" || !code.trim())
    throw new TypeError("AppError code must be a non-empty string.");
};

const assertType = (type) => {
  if (!VALID_TYPES.has(type))
    throw new TypeError(
      `AppError type must be one of: ${Array.from(VALID_TYPES).join(", ")}. Received "${type}".`,
    );
};

const assertLevel = (level) => {
  if (!VALID_LEVELS.has(level))
    throw new TypeError(
      `AppError level must be one of: ${Array.from(VALID_LEVELS).join(", ")}. Received "${level}".`,
    );
};

const ensureArray = (value) => {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
};

const createDefaultMessages = () => cloneLocalizedMessages(DEFAULT_MESSAGES);

const normalizeMessagesInput = (value) => {
  if (!value) return createDefaultMessages();

  if (typeof value === "string")
    return {
      user: ensureLocalizedText(value, DEFAULT_MESSAGES.user),
      original: ensureLocalizedText(value, DEFAULT_MESSAGES.original),
    };

  if (typeof value === "object") {
    const normalizedUser = ensureLocalizedText(value.user ?? value.original, DEFAULT_MESSAGES.user);
    const normalizedOriginal = ensureLocalizedText(value.original ?? value.user, DEFAULT_MESSAGES.original);

    return {
      user: normalizedUser,
      original: normalizedOriginal,
    };
  }

  return createDefaultMessages();
};

export const createAppErrorBuilder = ({ code, type }) => {
  assertCode(code);
  assertType(type);

  const state = {
    code: code.trim(),
    type,
    level: DEFAULT_LEVEL_BY_TYPE[type] ?? ERROR_LEVELS.ERROR,
    messages: createDefaultMessages(),
    reason: null,
    descriptions: [],
    service: null,
    metadata: {},
    breadcrumbs: [],
    causes: [],
    originalError: null,
    timestamp: new Date(),
  };

  const builder = {
    withMessages(messages) {
      state.messages = normalizeMessagesInput(messages);
      return this;
    },

    withReason(reason) {
      if (reason != null && typeof reason !== "string") {
        throw new TypeError("AppError reason must be a string.");
      }
      state.reason = reason ?? null;
      return this;
    },

    withLevel(level) {
      assertLevel(level);
      state.level = level;
      return this;
    },

    withService(service = {}) {
      const { name = null, method = null, args = null, operation = null } = service;
      state.service = {
        name,
        method,
        args,
        operation,
      };
      return this;
    },

    withMetadata(extra = {}) {
      if (extra == null || typeof extra !== "object") {
        throw new TypeError("AppError metadata must be an object.");
      }
      state.metadata = deepMerge(state.metadata, extra);
      return this;
    },

    withDescriptions(descriptions) {
      state.descriptions = ensureArray(descriptions);
      return this;
    },

    withBreadcrumbs(breadcrumbs) {
      state.breadcrumbs = ensureArray(breadcrumbs);
      return this;
    },

    withCauses(causes) {
      state.causes = ensureArray(causes);
      return this;
    },

    withOriginalError(error) {
      if (error === undefined) return this;
      if (error !== null && !(error instanceof Error)) {
        throw new TypeError("AppError originalError must be an instance of Error.");
      }
      state.originalError = error;
      return this;
    },

    withTimestamp(timestamp) {
      if (!(timestamp instanceof Date) && Number.isNaN(Date.parse(timestamp))) {
        throw new TypeError("AppError timestamp must be a Date or parsable date string.");
      }
      state.timestamp = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return this;
    },

    build() {
      return Object.freeze(
        new AppError({
          code: state.code,
          type: state.type,
          level: state.level,
          messages: state.messages,
          reason: state.reason,
          descriptions: state.descriptions,
          service: state.service,
          metadata: state.metadata,
          breadcrumbs: state.breadcrumbs,
          causes: state.causes,
          originalError: state.originalError,
          timestamp: state.timestamp,
        }),
      );
    },
  };

  return builder;
};
