const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.message || 'Không thể tải dữ liệu.');
    this.name = 'ApiError';
    this.status = status;
    this.code = payload?.error || 'REQUEST_FAILED';
    this.fields = payload?.fields || {};
  }
}

export async function request(path, options = {}) {
  const { skipUnauthorizedRedirect = false, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});
  headers.set('Accept', 'application/json');
  if (fetchOptions.body !== undefined) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...fetchOptions,
    headers,
    credentials: 'same-origin',
  });
  if (response.status === 401 && !skipUnauthorizedRedirect) {
    window.location.hash = '#login';
    throw new ApiError(401, { error: 'UNAUTHORIZED', message: 'Phiên đăng nhập đã hết hạn.' });
  }

  let payload = null;
  if (response.status !== 204) {
    const body = await response.text();
    if (body) {
      try {
        payload = JSON.parse(body);
      } catch {
        throw new ApiError(response.status, {
          error: response.ok ? 'INVALID_RESPONSE' : 'REQUEST_FAILED',
          message: response.ok ? 'Máy chủ trả về dữ liệu không hợp lệ.' : 'Không thể tải dữ liệu.',
        });
      }
    }
  }
  if (!response.ok) throw new ApiError(response.status, payload);
  return payload;
}

export function encodePathSegment(value) {
  return encodeURIComponent(value);
}
