import { fileUploadApi } from "@/lib/api";

// function to upload profile setup data
const uploadProfileSetup = async (formData: FormData): Promise<any> => {
    // POST request to /user/profile-setup
    const response = await fileUploadApi.post('/user/profile-setup', formData);
    // log the response if request is successful
    console.log('[+] Profile setup response:', response.data);

    // return the response data
    return response.data;
}

// export the function
export { uploadProfileSetup };