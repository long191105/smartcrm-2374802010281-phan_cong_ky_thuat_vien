import { request } from './client.js';

function queryString(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, value);
  }
  return params.size ? `?${params.toString()}` : '';
}

export const appointmentsApi = {
  list: (query = {}) => request(`/appointments${queryString(query)}`),
  create: (payload) => request('/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};
