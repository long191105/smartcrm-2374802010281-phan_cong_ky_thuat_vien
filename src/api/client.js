const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const tokenStorageKey = 'smartcrm.auth.token';

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
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  const token = window.localStorage.getItem(tokenStorageKey);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
  if (response.status === 401) {
    window.localStorage.removeItem(tokenStorageKey);
    window.location.assign('/#login');
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
