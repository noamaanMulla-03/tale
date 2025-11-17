// import axios
import axios from 'axios';

// import base URL
import API_URL from '@/config';

// import User and AuthResponse interfaces
import { AuthResponse, LoginCredentials } from '../types/index';

// create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

// function for creating user account
const loginUser = async (userData: LoginCredentials): Promise<AuthResponse> => {

    try {
        // POST request to /auth/login
        const response = await api.post('/auth/login', userData);

        // log the response if request is successful
        console.log(`[+]Response: ${response}`);

        // return the response
        return response.data;
    }

    catch(error) {

        // log the error if request is unsuccessful
        console.error(`[!]Error: ${error}`);
        throw error;
    };
}

// export the function
export { loginUser };