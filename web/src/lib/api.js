import axios from 'axios';
import { authStore } from '@/store/auth';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({ baseURL, timeout: 30000 });

// Attach the access token to every request.
api.interceptors.request.use((config) => {
  const { accessToken } = authStore.getState();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Transparent refresh on 401. Queues concurrent requests during a single refresh.
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    if (response?.status === 401 && !config._retry) {
      const { refreshToken, clear, setSession } = authStore.getState();
      if (!refreshToken) {
        clear();
        return Promise.reject(error);
      }
      config._retry = true;
      try {
        refreshing =
          refreshing ||
          axios.post(`${baseURL}/auth/refresh`, { refreshToken }).then((r) => r.data.data);
        const data = await refreshing;
        refreshing = null;
        setSession(data);
        config.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(config);
      } catch (e) {
        refreshing = null;
        clear();
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  },
);

// Normalised error message extractor for toasts.
export function apiError(error, fallback = 'Something went wrong') {
  return error?.response?.data?.error?.message || error?.message || fallback;
}

// Thin helpers returning the unwrapped `data` envelope.
export const http = {
  get: (url, params) => api.get(url, { params }).then((r) => r.data),
  post: (url, body, config) => api.post(url, body, config).then((r) => r.data),
  patch: (url, body) => api.patch(url, body).then((r) => r.data),
  put: (url, body) => api.put(url, body).then((r) => r.data),
  delete: (url) => api.delete(url).then((r) => r.data),
};
