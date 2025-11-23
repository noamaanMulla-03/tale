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

// export the axios instance
export default api;