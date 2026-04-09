export function errorResponse(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export function successResponse<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}