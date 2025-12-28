// import axios
import axios from 'axios';

// import base URL
import API_URL from '@/config';
// import auth store
import useAuthStore from '@/store/useAuthStore';

// create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// create an axios instance for file uploads
const fileUploadApi = axios.create({
    baseURL: API_URL,
    // Don't set Content-Type - let axios handle it automatically with proper boundary
});

// Add request interceptor to include auth token for file uploads
fileUploadApi.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add response interceptor to handle auth errors for both instances
const handleAuthError = (error: any) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
        // Only redirect if not on public pages (login, signup, verify-email)
        const publicPaths = ['/login', '/signup', '/verify-email', '/'];
        const currentPath = window.location.pathname;

        if (!publicPaths.includes(currentPath)) {
            // Use store's logout method to clear everything properly
            useAuthStore.getState().logout();

            // Redirect to login
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
};

api.interceptors.response.use(
    (response) => response,
    handleAuthError
);

fileUploadApi.interceptors.response.use(
    (response) => response,
    handleAuthError
);

// export the axios instance
export default api;
export { fileUploadApi };