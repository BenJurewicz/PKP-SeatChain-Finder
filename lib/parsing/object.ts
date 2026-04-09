import type { JsonObject } from '@/lib/domain/types';

/**
 * Safely casts an unknown value to an object, returning null if invalid.
 * Use this when you want to check and handle nulls yourself.
 *
 * @example
 * const obj = asObject(someValue);
 * if (!obj) {
 *   // handle error
 *   return;
 * }
 * // use obj safely
 */
export function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

/**
 * Safely casts an unknown value to an object, throwing if invalid.
 * Use this when the value is required and missing values should halt execution.
 *
 * @throws Error if value is not a valid object
 * @example
 * try {
 *   const obj = requireObject(data, "response");
 *   // use obj safely
 * } catch (e) {
 *   // handle error
 * }
 */
export function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid object for ${label}`);
  }
  return value as Record<string, unknown>;
}

/**
 * Safely casts an unknown value to a JsonObject, returning null if invalid.
 * JsonObject is an object with string keys and JsonValue values.
 */
export function asJsonObject(value: unknown): JsonObject | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as JsonObject;
}

/**
 * Safely casts an unknown value to a JsonObject, throwing if invalid.
 */
export function requireJsonObject(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid JSON object for ${label}`);
  }
  return value as JsonObject;
}

/**
 * Safely casts an unknown value to an array, returning null if invalid.
 */
export function asArray(value: unknown): unknown[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  return value;
}

/**
 * Safely casts an unknown value to an array, throwing if invalid.
 */
export function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid array for ${label}`);
  }
  return value;
}