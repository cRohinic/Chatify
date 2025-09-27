// src/lib/axios.js
import axios from "axios";
import toast from "react-hot-toast";

const API_BASE =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000/api"
    : "/api";

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthEndpoint = err.config?.url?.includes('/auth/');
    
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("token");
      toast.error("Session expired. Please login again.");
      setTimeout(() => {
        if (!window.location.pathname.includes('/login')) {
          window.location.href = "/login";
        }
      }, 1000);
    } else if (err.response?.status === 429) {
      if (!isAuthEndpoint) {
        toast.error("Too many requests. Please wait a moment.");
      }
      console.log("Rate limited:", err.config?.url);
    } else if (err.response?.status >= 500) {
      toast.error("Server error. Please try again later.");
    } else if (err.code === 'ECONNABORTED') {
      if (!isAuthEndpoint) {
        toast.error("Request timed out. Please try again.");
      }
    }
    
    return Promise.reject(err);
  }
);

// Clear auth data function
const clearAuthData = () => {
  localStorage.removeItem("token");
};

// Exports
export { axiosInstance, clearAuthData };
export default axiosInstance;