import { fileUploadApi } from "@/lib/api";
import api from "@/lib/api";

// Interface for profile data
interface ProfileData {
    id: string;
    username: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    phoneNumber?: string;
    gender?: string;
    dob?: string;
    profileCompletedAt?: string;
}

// function to upload profile setup data
const uploadProfileSetup = async (formData: FormData): Promise<any> => {
    // POST request to /auth/profile-setup
    const response = await fileUploadApi.post('/auth/profile-setup', formData);
    // log the response if request is successful
    console.log('[+] Profile setup response:', response.data);

    // return the response data
    return response.data;
}

// function to get user profile data
const getUserProfile = async (): Promise<ProfileData> => {
    try {
        // GET request to /auth/profile
        const response = await api.get('/auth/profile');
        // log the response if request is successful
        console.log('[+] User profile:', response.data);

        // return the profile data
        return response.data.profile;
    } catch (error) {
        console.error('[!] Error fetching profile:', error);
        throw error;
    }
}

// export the functions
export { uploadProfileSetup, getUserProfile };
export type { ProfileData };