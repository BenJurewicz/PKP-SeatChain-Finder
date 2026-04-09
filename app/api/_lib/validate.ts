import { errorResponse } from './error-response';

export function validateRequired<T extends Record<string, unknown>>(
  body: Partial<T>,
  fields: (keyof T)[]
): { error: Response; data: null } | { error: null; data: T } {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null) {
      return {
        error: errorResponse(`Missing required field: ${String(field)}`),
        data: null,
      };
    }
  }
  
  return { error: null, data: body as T };
}