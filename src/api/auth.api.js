import { request } from './client.js';

export const authApi = {
  login(username, password) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      skipUnauthorizedRedirect: true,
    });
  },

  me() {
    return request('/auth/me');
  },

  logout() {
    return request('/auth/logout', {
      method: 'POST',
      skipUnauthorizedRedirect: true,
    });
  },
};
