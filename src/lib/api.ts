// import axios
import axios from 'axios';

// import base URL
import API_URL from '@/config';

// create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// create an axios instance for file uploads
const fileUploadApi = axios.create({
    baseURL: API_URL,
    // Don't set Content-Type - let axios handle it automatically with proper boundary
});

// export the axios instance
export default api;
export { fileUploadApi };