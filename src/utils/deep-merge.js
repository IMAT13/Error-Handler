const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export const deepMerge = (target, source) => {
  if (!isObject(target) || !isObject(source)) {
    return isObject(source) ? { ...source } : source;
  }

  const result = { ...target };

  for (const key of Object.keys(source)) {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      result[key] = [...targetValue, ...sourceValue];
      continue;
    }

    if (isObject(targetValue) && isObject(sourceValue)) {
      result[key] = deepMerge(targetValue, sourceValue);
      continue;
    }

    result[key] = isObject(sourceValue) ? deepMerge({}, sourceValue) : sourceValue;
  }

  return result;
};
