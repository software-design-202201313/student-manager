import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api/v1',
  withCredentials: true,
});

// Lazy import to avoid circular deps
const getAuthStore = async () => await import('../stores/authStore');

apiClient.interceptors.request.use(async (config) => {
  const { useAuthStore } = await getAuthStore();
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config.__isRetryRequest) {
      error.config.__isRetryRequest = true;
      try {
        const { data } = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const { useAuthStore } = await getAuthStore();
        useAuthStore.getState().setAccessToken(data.access_token);
        error.config.headers['Authorization'] = `Bearer ${data.access_token}`;
        return apiClient(error.config);
      } catch {
        const { useAuthStore } = await getAuthStore();
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;

