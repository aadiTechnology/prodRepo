import client from "../client";

export interface ProfileResponse {
    full_name: string;
    email: string;
    role: string;
    is_active: boolean;
    profile_image_path?: string;
}

export interface ProfileUpdate {
    full_name: string;
}

const profileService = {
    getProfile: async () => {
        const response = await client.get<ProfileResponse>("/profile");
        return response.data;
    },

    updateProfile: async (data: ProfileUpdate) => {
        const response = await client.put<ProfileResponse>("/profile", data);
        return response.data;
    },

    uploadImage: async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const response = await client.post<ProfileResponse>("/profile/upload-image", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },

    deleteImage: async () => {
        const response = await client.delete<ProfileResponse>("/profile/image");
        return response.data;
    },
};

export default profileService;
