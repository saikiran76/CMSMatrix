// import axios from 'axios';
// import https from 'https';


// const api = axios.create({
//   // baseURL: import.meta.env.VITE_API_URL || 'https://cmsmatrix.onrender.com',
//   baseURL: 'https://localhost:3001',
//   timeout: 30000,
//   withCredentials: true,
//   headers: {
//     'Content-Type': 'application/json',
//     'Accept': 'application/json'
//   }
// });

// if (typeof window === 'undefined') {
//   const https = await import('https');
//   instance.defaults.httpsAgent = new https.Agent({
//     rejectUnauthorized: false, // For self-signed certificates
//   });
// }

// // // Request interceptor
// // instance.interceptors.request.use(
// //   (config) => {
// //     const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3MzhlZGY0OTkxNWMyODNkMDUyMzkyYyIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MzQ1MzMwNzksImV4cCI6MTczNDYxOTQ3OX0.zIr1QNGCJGi0dLvHlLhhY3_3cDMbfMWbXBtvHPv209E'
// //     // const token = localStorage.getItem('token');
// //     config.headers.Authorization = `Bearer ${adminToken}`;
// //     // if (adminToken) {
// //     //   config.headers.Authorization = `Bearer ${adminToken}`;
// //     // }
// //     return config;
// //   },
// //   (error) => {
// //     return Promise.reject(error);
// //   }
// // );

// // // Response interceptor
// // instance.interceptors.response.use(
// //   (response) => response,
// //   async (error) => {
// //     if (error.code === 'ERR_NETWORK') {
// //       console.error('Network error:', error);
// //       // Implement retry logic here if needed
// //     }
// //     return Promise.reject(error);
// //   }
// // );




// export default api;

import axios from 'axios';
// import https from 'https';

const api = axios.create({
  // baseURL: 'https://localhost:3001',
  baseURL: "http://localhost:3001",
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  
  return config;
}, error => Promise.reject(error));

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Add httpsAgent for Node.js environment
// if (typeof window === 'undefined') {
//   api.defaults.httpsAgent = new https.Agent({
//     rejectUnauthorized: false, // For self-signed certificates
//   });
// }

// // Request interceptor
// api.interceptors.request.use(config => {
//   if (typeof window !== 'undefined') {
//     const token = localStorage.getItem('token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//   }
//   return config;
// }, error => Promise.reject(error));

// // Response interceptor
// api.interceptors.response.use(
//   response => response,
//   error => {
//     if (error.response?.status === 401) {
//       if (typeof window !== 'undefined') {
//         localStorage.removeItem('token');
//         localStorage.removeItem('user');
//         window.location.href = '/login';
//       }
//     }
//     return Promise.reject(error);
//   }
// );

export default api;
