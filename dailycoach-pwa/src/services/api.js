import axios from 'axios';

const devApiUrl = typeof window !== 'undefined' ? localStorage.getItem('dev_api_url') : null;

const api = axios.create({
  baseURL: devApiUrl || import.meta.env.VITE_API_BASE_URL || '/api',
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    const userStr = localStorage.getItem('dailycoach_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
