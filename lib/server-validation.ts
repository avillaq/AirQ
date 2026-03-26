export class ApiValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'ApiValidationError';
    this.statusCode = statusCode;
  }
}

export function toNumber(value: string | null, field: string, min?: number, max?: number): number {
  if (value === null || value === undefined || value === '') {
    throw new ApiValidationError(`'${field}' is required`);
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new ApiValidationError(`'${field}' must be a valid number`);
  }

  if (min !== undefined && parsed < min) {
    throw new ApiValidationError(`'${field}' must be >= ${min}`);
  }

  if (max !== undefined && parsed > max) {
    throw new ApiValidationError(`'${field}' must be <= ${max}`);
  }

  return parsed;
}

export function toInteger(value: unknown, field: string, min?: number, max?: number): number {
  if (value === null || value === undefined || value === '') {
    throw new ApiValidationError(`'${field}' is required`);
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new ApiValidationError(`'${field}' must be an integer`);
  }

  if (min !== undefined && parsed < min) {
    throw new ApiValidationError(`'${field}' must be >= ${min}`);
  }

  if (max !== undefined && parsed > max) {
    throw new ApiValidationError(`'${field}' must be <= ${max}`);
  }

  return parsed;
}

export function toString(value: unknown, field: string, minLen?: number, maxLen?: number): string {
  if (value === null || value === undefined) {
    throw new ApiValidationError(`'${field}' is required`);
  }

  const parsed = String(value).trim();
  if (!parsed) {
    throw new ApiValidationError(`'${field}' cannot be empty`);
  }

  if (minLen !== undefined && parsed.length < minLen) {
    throw new ApiValidationError(`'${field}' must be at least ${minLen} characters`);
  }

  if (maxLen !== undefined && parsed.length > maxLen) {
    throw new ApiValidationError(`'${field}' must be at most ${maxLen} characters`);
  }

  return parsed;
}

export function toEmail(value: unknown): string {
  const email = toString(value, 'email', 5, 120).toLowerCase();
  const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!re.test(email)) {
    throw new ApiValidationError("'email' must be a valid email address");
  }
  return email;
}

export function parseLatLngFromQuery(searchParams: URLSearchParams): { lat: number; lng: number } {
  const lat = toNumber(searchParams.get('lat'), 'lat', -90, 90);
  const lng = toNumber(searchParams.get('lng'), 'lng', -180, 180);
  return { lat, lng };
}

export function parseLatLngFromLocation(location: unknown): { lat: number; lng: number } {
  const locationValue = toString(location, 'location', 3, 80);
  const parts = locationValue.split(',').map((part) => part.trim());
  if (parts.length !== 2) {
    throw new ApiValidationError("'location' must have format 'lat,lng'");
  }

  const lat = toNumber(parts[0], 'location.lat', -90, 90);
  const lng = toNumber(parts[1], 'location.lng', -180, 180);
  return { lat, lng };
}
