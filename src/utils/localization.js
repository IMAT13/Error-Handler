const cloneFallback = (fallback = {}) => ({
  fa: fallback?.fa ?? null,
  en: fallback?.en ?? null,
});

export const ensureLocalizedText = (value, fallback = {}) => {
  const normalizedFallback = cloneFallback(fallback);

  if (value == null) {
    return normalizedFallback;
  }

  if (typeof value === "string") {
    return { fa: value, en: value };
  }

  if (typeof value === "object") {
    const fa = value.fa ?? value.en ?? normalizedFallback.fa;
    const en = value.en ?? value.fa ?? normalizedFallback.en;
    return { fa, en };
  }

  return normalizedFallback;
};

export const cloneLocalizedMessages = (messages = {}) => ({
  user: ensureLocalizedText(messages.user),
  original: ensureLocalizedText(messages.original),
});
