// import axios instance
import api from '@/lib/api';
import useAuthStore from '@/store/useAuthStore';

// Verify email OTP
const verifyEmailOTP = async (otp: string): Promise<void> => {
    // get user email from auth store
    const email = useAuthStore.getState().user?.email;
    // throw error if email not found
    if (!email) throw new Error('User email not found');
    
    // make API request to verify OTP
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data;
}

// Send/Resend email OTP
const sendEmailOTP = async (): Promise<void> => {
    // get user email from auth store
    const email = useAuthStore.getState().user?.email;
    // throw error if email not found
    if (!email) throw new Error('User email not found');
    
    // make API request to send OTP
    const response = await api.post('/auth/send-otp', { email });
    return response.data;
}

// export the functions
export { verifyEmailOTP, sendEmailOTP }