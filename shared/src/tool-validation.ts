/**
 * Type-safe tool input validation helpers.
 * Inspired by openclaw's readStringParam / readNumberParam pattern.
 */

export class ToolInputError extends Error {
  readonly status: number = 400;
  constructor(message: string) {
    super(message);
    this.name = "ToolInputError";
  }
}

export class ToolAuthorizationError extends ToolInputError {
  override readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = "ToolAuthorizationError";
  }
}

function readParamRaw(
  params: Record<string, unknown>,
  key: string,
): unknown | undefined {
  return params[key];
}

export function readStringParam(
  params: Record<string, unknown>,
  key: string,
  options: {
    required?: boolean;
    trim?: boolean;
    label?: string;
    allowEmpty?: boolean;
    maxLength?: number;
  } = {},
): string | undefined {
  const {
    required = false,
    trim = true,
    label = key,
    allowEmpty = false,
    maxLength,
  } = options;
  const raw = readParamRaw(params, key);

  if (raw === undefined || raw === null) {
    if (required) throw new ToolInputError(`${label} is required`);
    return undefined;
  }

  if (typeof raw !== "string") {
    throw new ToolInputError(`${label} must be a string`);
  }

  let value = trim ? raw.trim() : raw;

  if (!allowEmpty && value.length === 0) {
    if (required) throw new ToolInputError(`${label} must not be empty`);
    return undefined;
  }

  if (maxLength && value.length > maxLength) {
    throw new ToolInputError(
      `${label} exceeds maximum length of ${maxLength}`,
    );
  }

  return value;
}

export function readNumberParam(
  params: Record<string, unknown>,
  key: string,
  options: {
    required?: boolean;
    label?: string;
    min?: number;
    max?: number;
    integer?: boolean;
  } = {},
): number | undefined {
  const { required = false, label = key, min, max, integer = false } = options;
  const raw = readParamRaw(params, key);

  if (raw === undefined || raw === null) {
    if (required) throw new ToolInputError(`${label} is required`);
    return undefined;
  }

  const value = typeof raw === "string" ? Number(raw) : raw;

  if (typeof value !== "number" || isNaN(value)) {
    throw new ToolInputError(`${label} must be a number`);
  }

  if (integer && !Number.isInteger(value)) {
    throw new ToolInputError(`${label} must be an integer`);
  }

  if (min !== undefined && value < min) {
    throw new ToolInputError(`${label} must be >= ${min}`);
  }

  if (max !== undefined && value > max) {
    throw new ToolInputError(`${label} must be <= ${max}`);
  }

  return value;
}

export function readBooleanParam(
  params: Record<string, unknown>,
  key: string,
  options: { required?: boolean; label?: string; defaultValue?: boolean } = {},
): boolean | undefined {
  const { required = false, label = key, defaultValue } = options;
  const raw = readParamRaw(params, key);

  if (raw === undefined || raw === null) {
    if (defaultValue !== undefined) return defaultValue;
    if (required) throw new ToolInputError(`${label} is required`);
    return undefined;
  }

  if (typeof raw === "boolean") return raw;
  if (raw === "true") return true;
  if (raw === "false") return false;

  throw new ToolInputError(`${label} must be a boolean`);
}

export function readArrayParam<T = unknown>(
  params: Record<string, unknown>,
  key: string,
  options: {
    required?: boolean;
    label?: string;
    maxItems?: number;
  } = {},
): T[] | undefined {
  const { required = false, label = key, maxItems } = options;
  const raw = readParamRaw(params, key);

  if (raw === undefined || raw === null) {
    if (required) throw new ToolInputError(`${label} is required`);
    return undefined;
  }

  if (!Array.isArray(raw)) {
    throw new ToolInputError(`${label} must be an array`);
  }

  if (maxItems && raw.length > maxItems) {
    throw new ToolInputError(
      `${label} exceeds maximum of ${maxItems} items`,
    );
  }

  return raw as T[];
}
