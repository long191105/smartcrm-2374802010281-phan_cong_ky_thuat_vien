import { encodePathSegment, request } from './client.js';

function queryString(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, value);
  }
  return params.size ? `?${params.toString()}` : '';
}

export const ticketsApi = {
  list: (query = {}) => request(`/tickets${queryString(query)}`),
  assign: (ticketCode, payload) => request(
    `/tickets/${encodePathSegment(ticketCode)}/assignment`,
    { method: 'POST', body: JSON.stringify(payload) },
  ),
  history: (ticketCode) => request(
    `/tickets/${encodePathSegment(ticketCode)}/history`,
  ),
  updateStatus: (ticketCode, payload) => request(
    `/tickets/${encodePathSegment(ticketCode)}/status`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  ),
};
