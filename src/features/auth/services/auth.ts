// import User, AuthResponse and RegistrationData interfaces
import { AuthResponse, LoginCredentials, RegistrationData } from '@/types/index';
// import axios instance
import api from '@/lib/api';

// function for logging in user account
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

// function for registering new user account
const registerUser = async (userData: RegistrationData): Promise<AuthResponse> => {
    
    try {
        // POST request to /auth/register
        const response = await api.post('/auth/register', userData);

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
export { loginUser, registerUser };