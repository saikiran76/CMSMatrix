import axios from 'axios';

const instance = axios.create({
  // baseURL: import.meta.env.VITE_API_URL || 'https://cmsmatrix.onrender.com',
  baseURL: 'http://localhost:3001',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor
instance.interceptors.request.use(
  (config) => {
    const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3MzhlZGY0OTkxNWMyODNkMDUyMzkyYyIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MzQ1MzMwNzksImV4cCI6MTczNDYxOTQ3OX0.zIr1QNGCJGi0dLvHlLhhY3_3cDMbfMWbXBtvHPv209E'
    // const token = localStorage.getItem('token');
    config.headers.Authorization = `Bearer ${adminToken}`;
    // if (adminToken) {
    //   config.headers.Authorization = `Bearer ${adminToken}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error:', error);
      // Implement retry logic here if needed
    }
    return Promise.reject(error);
  }
);

export default instance;