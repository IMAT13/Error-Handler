export const ERROR_TYPES = Object.freeze({
  NETWORK: "network",
  VALIDATION: "validation",
  MAPPING: "mapping",
  PERMISSION: "permission",
  COMPONENT: "component",
  ENVIRONMENT: "environment",
  SYSTEM: "system",
  UNKNOWN: "unknown",
  FEATURE: "feature",
});

export const ERROR_LEVELS = Object.freeze({
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  FATAL: "fatal",
});

export const DEFAULT_LEVEL_BY_TYPE = Object.freeze({
  [ERROR_TYPES.NETWORK]: ERROR_LEVELS.ERROR,
  [ERROR_TYPES.VALIDATION]: ERROR_LEVELS.WARN,
  [ERROR_TYPES.MAPPING]: ERROR_LEVELS.ERROR,
  [ERROR_TYPES.PERMISSION]: ERROR_LEVELS.WARN,
  [ERROR_TYPES.COMPONENT]: ERROR_LEVELS.ERROR,
  [ERROR_TYPES.ENVIRONMENT]: ERROR_LEVELS.FATAL,
  [ERROR_TYPES.SYSTEM]: ERROR_LEVELS.ERROR,
  [ERROR_TYPES.UNKNOWN]: ERROR_LEVELS.ERROR,
  [ERROR_TYPES.FEATURE]: ERROR_LEVELS.INFO,
});

export const DEFAULT_MESSAGES = Object.freeze({
  user: Object.freeze({
    fa: "خطایی رخ داده است",
    en: "An unexpected error occurred",
  }),
  original: Object.freeze({
    fa: "خطایی رخ داده است",
    en: "An unexpected error occurred",
  }),
});

export const DEFAULT_TYPE_MESSAGES = Object.freeze({
  [ERROR_TYPES.NETWORK]: Object.freeze({
    user: Object.freeze({
      fa: "مشکل در اتصال به اینترنت",
      en: "Network connection issue",
    }),
    original: Object.freeze({
      fa: "مشکل در اتصال به اینترنت",
      en: "Network connection issue",
    }),
  }),
  [ERROR_TYPES.VALIDATION]: Object.freeze({
    user: Object.freeze({
      fa: "مقادیر وارد شده نامعتبر است",
      en: "Provided data is invalid",
    }),
    original: Object.freeze({
      fa: "مقادیر وارد شده نامعتبر است",
      en: "Provided data is invalid",
    }),
  }),
  [ERROR_TYPES.MAPPING]: Object.freeze({
    user: Object.freeze({
      fa: "خطا در پردازش داده‌ها",
      en: "Data processing encountered an error",
    }),
    original: Object.freeze({
      fa: "نگاشت داده با شکست مواجه شد",
      en: "Data mapping failed",
    }),
  }),
  [ERROR_TYPES.PERMISSION]: Object.freeze({
    user: Object.freeze({
      fa: "دسترسی مجاز نیست",
      en: "Permission denied",
    }),
    original: Object.freeze({
      fa: "کاربر مجوز لازم را ندارد",
      en: "User lacks required permission",
    }),
  }),
  [ERROR_TYPES.COMPONENT]: Object.freeze({
    user: Object.freeze({
      fa: "خطایی در اجرای برنامه رخ داد",
      en: "The application component failed",
    }),
    original: Object.freeze({
      fa: "خطایی در اجرای برنامه رخ داد",
      en: "The application component failed",
    }),
  }),
  [ERROR_TYPES.ENVIRONMENT]: Object.freeze({
    user: Object.freeze({
      fa: "پیکربندی یا محیط اجرا دچار مشکل شد",
      en: "Application environment misconfigured",
    }),
    original: Object.freeze({
      fa: "محیط اجرا با شکست مواجه شد",
      en: "Runtime environment failure detected",
    }),
  }),
  [ERROR_TYPES.SYSTEM]: Object.freeze({
    user: Object.freeze({
      fa: "خطای سیستمی رخ داد",
      en: "A system error occurred",
    }),
    original: Object.freeze({
      fa: "سیستم با خطا مواجه شد",
      en: "System experienced an error",
    }),
  }),
  [ERROR_TYPES.UNKNOWN]: Object.freeze({
    user: Object.freeze({
      fa: "مشکلی در برنامه رخ داد.",
      en: "An unknown error occurred",
    }),
    original: Object.freeze({
      fa: "جزئیات خطا مشخص نیست",
      en: "No additional error details available",
    }),
  }),
  [ERROR_TYPES.FEATURE]: Object.freeze({
    user: Object.freeze({
      fa: "این قابلیت در حال حاضر در دسترس نیست",
      en: "This feature is currently unavailable",
    }),
    original: Object.freeze({
      fa: "قابلیت یا فیچر غیرفعال است",
      en: "Feature flag disabled or feature unavailable",
    }),
  }),
});
