import { DEFAULT_LEVEL_BY_TYPE, DEFAULT_MESSAGES, ERROR_LEVELS } from "./constants.js";
import { ensureLocalizedText } from "./utils/localization.js";

const toArray = (value) => {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
};

const normalizeMessages = (messages = {}) => {
  if (typeof messages === "string") {
    return {
      user: ensureLocalizedText(messages, DEFAULT_MESSAGES.user),
      original: ensureLocalizedText(messages, DEFAULT_MESSAGES.original),
    };
  }

  const normalizedUser = ensureLocalizedText(messages.user ?? messages.original, DEFAULT_MESSAGES.user);
  const normalizedOriginal = ensureLocalizedText(
    messages.original ?? messages.user,
    DEFAULT_MESSAGES.original,
  );

  return {
    user: normalizedUser,
    original: normalizedOriginal,
  };
};

const normalizeBreadcrumbs = (breadcrumbs = []) =>
  toArray(breadcrumbs)
    .map((breadcrumb) => {
      if (!breadcrumb) return null;

      if (typeof breadcrumb === "string") {
        return Object.freeze({
          message: ensureLocalizedText(breadcrumb, DEFAULT_MESSAGES.user),
          category: null,
          level: null,
          data: null,
          timestamp: Date.now(),
        });
      }

      const { message, category, level, data, timestamp } = breadcrumb;
      if (!message) return null;

      const timeValue = timestamp ? new Date(timestamp).getTime() : Date.now();

      return Object.freeze({
        message: ensureLocalizedText(message, DEFAULT_MESSAGES.user),
        category: category ?? null,
        level: level ?? null,
        data: data ?? null,
        timestamp: Number.isNaN(timeValue) ? Date.now() : timeValue,
      });
    })
    .filter(Boolean);

const normalizeCause = (cause) => {
  if (!cause) return null;
  if (cause instanceof AppError) return cause;

  if (cause instanceof Error) {
    return Object.freeze({
      name: cause.name,
      message: ensureLocalizedText(cause.message, DEFAULT_MESSAGES.original),
      stack: cause.stack,
    });
  }

  if (typeof cause === "object" && "message" in cause) {
    return Object.freeze({
      ...cause,
      message: ensureLocalizedText(cause.message, DEFAULT_MESSAGES.original),
    });
  }

  return cause;
};

export class AppError extends Error {
  constructor({
    code,
    type,
    level,
    messages,
    reason = null,
    descriptions = [],
    service = null,
    metadata = {},
    breadcrumbs = [],
    causes = [],
    originalError = null,
    timestamp = new Date(),
    stack = null,
  }) {
    const normalizedMessages = normalizeMessages(messages);

    super(normalizedMessages.user.en ?? normalizedMessages.user.fa ?? DEFAULT_MESSAGES.user.en);

    this.name = "AppError";
    this.code = code;
    this.type = type;
    this.level = level ?? DEFAULT_LEVEL_BY_TYPE[type] ?? ERROR_LEVELS.ERROR;
    this.messages = Object.freeze({
      user: Object.freeze({ ...normalizedMessages.user }),
      original: Object.freeze({ ...normalizedMessages.original }),
    });
    this.reason = reason;
    this.descriptions = Object.freeze(descriptions);
    this.service = service ? Object.freeze({ ...service }) : null;
    this.metadata = Object.freeze({ ...metadata });
    this.breadcrumbs = Object.freeze(normalizeBreadcrumbs(breadcrumbs));
    this.causes = Object.freeze(Array.isArray(causes) ? causes.map(normalizeCause).filter(Boolean) : []);
    this.originalError = originalError ?? null;
    this.timestamp = timestamp instanceof Date ? timestamp : new Date(timestamp);

    if (stack) {
      this.stack = stack;
    } else if (originalError?.stack) {
      this.stack = originalError.stack;
    } else if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    } else {
      this.stack = new Error().stack;
    }

    Object.freeze(this);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      type: this.type,
      level: this.level,
      messages: this.messages,
      reason: this.reason,
      descriptions: this.descriptions,
      service: this.service,
      metadata: this.metadata,
      breadcrumbs: this.breadcrumbs,
      causes: this.causes,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  toString() {
    const userMessage = this.messages.user.en ?? this.messages.user.fa ?? "";
    return `${this.name}(${this.code}): ${userMessage}`;
  }
}
