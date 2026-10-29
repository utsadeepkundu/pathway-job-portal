
import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json"
  }
});

// Attach the current session's JWT to protected API requests.
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
