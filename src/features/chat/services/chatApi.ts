// Chat API Service
// Functions for interacting with chat-related backend endpoints

import { fileUploadApi } from '@/lib/api';

/**
 * Upload a file attachment (document, video, audio, etc.)
 * @param file File to upload
 * @returns Promise<{ fileUrl: string, fileName: string, fileSize: number, fileType: string }>
 */
export async function uploadFileAttachment(file: File): Promise<{
    fileUrl: string;
    fileName: string;
    fileSize: number;
    fileType: string;
}> {
    // Create FormData
    const formData = new FormData();
    formData.append('file', file);

    // Upload file
    const response = await fileUploadApi.post('/api/chat/upload/attachment', formData);
    return response.data;
}

/**
 * Upload an image file
 * @param file Image file to upload
 * @returns Promise<{ fileUrl: string, fileName: string, fileSize: number, fileType: string }>
 */
export async function uploadImageFile(file: File): Promise<{
    fileUrl: string;
    fileName: string;
    fileSize: number;
    fileType: string;
}> {
    // Create FormData
    const formData = new FormData();
    formData.append('file', file);

    // Upload image
    const response = await fileUploadApi.post('/api/chat/upload/image', formData);
    return response.data;
}

/**
 * Send a message with file attachment
 * Uploads the file first, then sends a message with file metadata
 * 
 * @param conversationId Conversation ID
 * @param file File to attach
 * @param caption Optional caption/message content
 * @param messageType Type of message ('file', 'image', 'video', 'audio')
 * @returns Promise<Message>
 */
export async function sendFileMessage(
    conversationId: number,
    file: File,
    caption?: string,
    messageType?: 'file' | 'image' | 'video' | 'audio'
): Promise<any> {
    // Determine message type based on file MIME type if not provided
    let type = messageType;
    if (!type) {
        if (file.type.startsWith('image/')) {
            type = 'image';
        } else if (file.type.startsWith('video/')) {
            type = 'video';
        } else if (file.type.startsWith('audio/')) {
            type = 'audio';
        } else {
            type = 'file';
        }
    }

    // Upload file first
    const uploadResult = type === 'image'
        ? await uploadImageFile(file)
        : await uploadFileAttachment(file);

    // Send message with file metadata
    const response = await fileUploadApi.post(
        `/api/chat/conversations/${conversationId}/messages`,
        {
            content: caption || '',
            messageType: type,
            fileUrl: uploadResult.fileUrl,
            fileName: uploadResult.fileName,
            fileSize: uploadResult.fileSize,
        }
    );

    return response.data.message;
}
