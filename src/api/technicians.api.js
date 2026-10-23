import { request } from './client.js';

function queryString(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, value);
  }
  return params.size ? `?${params.toString()}` : '';
}

export const techniciansApi = {
  list: (query = {}) => request(`/technicians${queryString(query)}`),
  assignedTickets: (code, query = {}) => request(
    `/technicians/${encodeURIComponent(code)}/tickets${queryString(query)}`,
  ),
};
