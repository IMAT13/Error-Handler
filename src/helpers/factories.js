import { createAppErrorBuilder } from "../app-error.builder.js";
import { AppError } from "../app-error.js";
import { DEFAULT_MESSAGES, DEFAULT_TYPE_MESSAGES, ERROR_LEVELS, ERROR_TYPES } from "../constants.js";
import { ensureLocalizedText } from "../utils/localization.js";

const cloneTypeMessages = (type, messages) => {
  const defaults = DEFAULT_TYPE_MESSAGES[type] ?? DEFAULT_MESSAGES;

  if (!messages) {
    return {
      user: { ...defaults.user },
      original: { ...defaults.original },
    };
  }

  if (typeof messages === "string") {
    const localized = ensureLocalizedText(messages, defaults.user);
    return {
      user: localized,
      original: ensureLocalizedText(messages, defaults.original),
    };
  }

  const userSource = messages.user ?? messages;
  const originalSource = messages.original ?? messages;

  return {
    user: ensureLocalizedText(userSource, defaults.user),
    original: ensureLocalizedText(originalSource, defaults.original),
  };
};

const applyCommonOptions = (builder, type, options = {}) => {
  const {
    messages,
    reason,
    level,
    descriptions,
    metadata,
    service,
    breadcrumbs,
    causes,
    originalError,
    timestamp,
  } = options;

  builder.withMessages(cloneTypeMessages(type, messages));

  if (reason !== undefined) builder.withReason(reason);

  if (level) builder.withLevel(level);

  if (descriptions) builder.withDescriptions(descriptions);

  if (metadata && Object.keys(metadata).length > 0) builder.withMetadata(metadata);

  if (service) builder.withService(service);

  if (breadcrumbs) builder.withBreadcrumbs(breadcrumbs);

  if (causes) builder.withCauses(causes);

  if (originalError instanceof Error) builder.withOriginalError(originalError);

  if (timestamp) builder.withTimestamp(timestamp);

  return builder;
};

const build = (builder) => builder.build();

const normalizeHttpMetadata = (metadata = {}) => {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }

  const { url = null, method = null, status = null, response, headers, payload, ...rest } = metadata;

  return {
    url,
    method,
    status,
    response,
    headers,
    payload,
    ...rest,
  };
};

const createNetworkError = (options = {}) => {
  const { code = "NETWORK_ERROR", metadata, retryCount, isOffline = false, ...rest } = options;

  const builder = createAppErrorBuilder({ code, type: ERROR_TYPES.NETWORK });
  applyCommonOptions(builder, ERROR_TYPES.NETWORK, {
    metadata: normalizeHttpMetadata(metadata),
    ...rest,
  });

  const enrichedMetadata = {
    retryCount: retryCount ?? null,
    isOffline,
  };

  if (Object.values(enrichedMetadata).some((value) => value != null)) {
    builder.withMetadata(enrichedMetadata);
  }

  return build(builder);
};

const createValidationError = (options = {}) => {
  const { code = "VALIDATION_ERROR", fields = [], schema = null, ...rest } = options;

  const builder = createAppErrorBuilder({ code, type: ERROR_TYPES.VALIDATION });
  applyCommonOptions(builder, ERROR_TYPES.VALIDATION, rest);

  const metadata = {
    fields: Array.isArray(fields) ? fields : [fields],
    schema,
  };

  if ((Array.isArray(metadata.fields) && metadata.fields.length > 0) || metadata.schema != null) {
    builder.withMetadata(metadata);
  }

  return build(builder);
};

const createMappingError = (options = {}) => {
  const { code = "MAPPING_ERROR", source = null, target = null, stage = null, ...rest } = options;

  const builder = createAppErrorBuilder({ code, type: ERROR_TYPES.MAPPING });
  applyCommonOptions(builder, ERROR_TYPES.MAPPING, rest);

  const metadata = {
    source,
    target,
    stage,
  };

  if (Object.values(metadata).some((value) => value != null)) {
    builder.withMetadata(metadata);
  }

  return build(builder);
};

const createPermissionError = (options = {}) => {
  const {
    code = "PERMISSION_DENIED",
    resource = null,
    action = null,
    requiredRoles = null,
    ...rest
  } = options;

  const builder = createAppErrorBuilder({ code, type: ERROR_TYPES.PERMISSION });
  applyCommonOptions(builder, ERROR_TYPES.PERMISSION, rest);

  const metadata = {
    resource,
    action,
    requiredRoles,
  };

  if (Object.values(metadata).some((value) => value != null)) {
    builder.withMetadata(metadata);
  }

  return build(builder);
};

const createComponentError = (options = {}) => {
  const {
    code = "COMPONENT_ERROR",
    componentName = null,
    propsSnapshot = null,
    hook = null,
    ...rest
  } = options;

  const builder = createAppErrorBuilder({ code, type: ERROR_TYPES.COMPONENT });
  applyCommonOptions(builder, ERROR_TYPES.COMPONENT, rest);

  const metadata = {
    componentName,
    propsSnapshot,
    hook,
  };

  if (Object.values(metadata).some((value) => value != null)) {
    builder.withMetadata(metadata);
  }

  return build(builder);
};

const createEnvironmentError = (options = {}) => {
  const { code = "ENVIRONMENT_ERROR", variable = null, expected = null, received = null, ...rest } = options;

  const builder = createAppErrorBuilder({ code, type: ERROR_TYPES.ENVIRONMENT });
  applyCommonOptions(builder, ERROR_TYPES.ENVIRONMENT, rest);

  const metadata = {
    variable,
    expected,
    received,
  };

  if (Object.values(metadata).some((value) => value != null)) {
    builder.withMetadata(metadata);
  }

  return build(builder);
};

const createSystemError = (options = {}) => {
  const { code = "SYSTEM_ERROR", subsystem = null, ...rest } = options;

  const builder = createAppErrorBuilder({ code, type: ERROR_TYPES.SYSTEM });
  applyCommonOptions(builder, ERROR_TYPES.SYSTEM, rest);

  if (subsystem) {
    builder.withMetadata({ subsystem });
  }

  return build(builder);
};

const createUnknownError = (options = {}) => {
  const { code = "UNKNOWN_ERROR", originalError, fallbackMessage, ...rest } = options;

  const builder = createAppErrorBuilder({ code, type: ERROR_TYPES.UNKNOWN });

  const { messages, reason } = (() => {
    if (rest.messages) {
      return { messages: rest.messages, reason: rest.reason };
    }

    const fallback = fallbackMessage ?? originalError?.message;
    if (fallback) {
      const localized = ensureLocalizedText(fallback, DEFAULT_TYPE_MESSAGES[ERROR_TYPES.UNKNOWN].user);
      return {
        messages: {
          user: localized,
          original: ensureLocalizedText(fallback, DEFAULT_TYPE_MESSAGES[ERROR_TYPES.UNKNOWN].original),
        },
        reason: rest.reason ?? (typeof fallback === "string" ? fallback : undefined),
      };
    }

    return {
      messages: DEFAULT_TYPE_MESSAGES[ERROR_TYPES.UNKNOWN],
      reason: rest.reason,
    };
  })();

  applyCommonOptions(builder, ERROR_TYPES.UNKNOWN, {
    ...rest,
    messages,
    reason,
    originalError,
  });

  builder.withMetadata({
    originalName: rest.metadata?.originalName ?? originalError?.name,
  });

  return build(builder);
};

const createFeatureError = (options = {}) => {
  const {
    code = "FEATURE_UNAVAILABLE",
    feature = null,
    flag = null,
    requiredVersion = null,
    ...rest
  } = options;

  const builder = createAppErrorBuilder({ code, type: ERROR_TYPES.FEATURE });
  applyCommonOptions(builder, ERROR_TYPES.FEATURE, rest);

  const metadata = {
    feature,
    flag,
    requiredVersion,
  };

  if (Object.values(metadata).some((value) => value != null)) {
    builder.withMetadata(metadata);
  }

  return build(builder);
};

const isAppError = (value) => value instanceof AppError;

export default {
  network: createNetworkError,
  validation: createValidationError,
  mapping: createMappingError,
  permission: createPermissionError,
  component: createComponentError,
  environment: createEnvironmentError,
  system: createSystemError,
  unknown: createUnknownError,
  feature: createFeatureError,
  isAppError,
  Levels: ERROR_LEVELS,
  Types: ERROR_TYPES,
};
