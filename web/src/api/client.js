export class ApiError extends Error {
  constructor(code, message, { status = 0, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function buildUrl(path, query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function request(path, { method = 'GET', query, body, headers, signal } = {}) {
  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError('NETWORK', 'Немає з’єднання з сервером. Перевірте інтернет і спробуйте ще раз.');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const envelope = data?.error;
    throw new ApiError(envelope?.code ?? 'INTERNAL', envelope?.message ?? 'Щось пішло не так. Спробуйте ще раз.', {
      status: response.status,
      details: envelope?.details,
    });
  }
  return data;
}
