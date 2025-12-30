// ============================================================================
// CHAT API SERVICE - HTTP requests for chat functionality
// ============================================================================
// Handles all REST API calls for conversations and messages
// Uses axios instance from @/lib/api for authentication
// ============================================================================

// Import axios instance (with auth interceptors)
import api from '@/lib/api';

// Import types
import { Message } from '@/types/chat';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Conversation object returned from API
 * Includes other participant info and last message preview
 */
export interface ConversationResponse {
    conversation_id: number;
    created_at: string;
    updated_at: string;
    // Other participant info
    other_user_id: number;
    other_username: string;
    other_display_name: string;
    other_avatar_url: string | null;
    // Last message preview
    last_message_content: string | null;
    last_message_type: string | null;
    last_message_time: string | null;
    last_message_sender_id: number | null;
    // Unread count
    unread_count: number;
    // User's participant data
    last_read_at: string | null;
    is_archived: boolean;
}

/**
 * Conversation details with full participant list
 */
export interface ConversationDetails {
    id: number;
    created_at: string;
    updated_at: string;
    participants: Array<{
        user_id: number;
        username: string;
        display_name: string;
        avatar_url: string | null;
    }>;
}

/**
 * Message object returned from API
 */
export interface MessageResponse {
    id: number;
    conversation_id: number;
    sender_id: number;
    content: string | null;
    message_type: 'text' | 'image' | 'file' | 'voice';
    file_url: string | null;
    file_name: string | null;
    file_size: number | null;
    created_at: string;
    updated_at: string | null;
    is_edited: boolean;
    // Sender info
    sender_username: string;
    sender_display_name: string;
    sender_avatar_url: string | null;
}

/**
 * Request body for creating/sending messages
 */
export interface SendMessageRequest {
    content?: string;
    messageType?: 'text' | 'image' | 'file' | 'voice';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
}

// ============================================================================
// CONVERSATION API CALLS
// ============================================================================

/**
 * Get all conversations for the authenticated user
 * Returns array of conversations with last message and unread count
 */
const getUserConversations = async (): Promise<ConversationResponse[]> => {
    try {
        // GET request to /api/chat/conversations
        const response = await api.get('/api/chat/conversations');

        // Log the response
        console.log('[+] Fetched user conversations');

        // Return conversations array
        return response.data.conversations;
    } catch (error) {
        // Log the error
        console.error('[!] Error fetching conversations:', error);
        throw error;
    }
};

/**
 * Create new conversation or get existing one with another user
 * @param otherUserId - ID of the user to start conversation with
 * @returns Conversation details object
 */
const createOrGetConversation = async (otherUserId: number): Promise<ConversationDetails> => {
    try {
        // POST request to /api/chat/conversations
        const response = await api.post('/api/chat/conversations', { otherUserId });

        // Log the response
        console.log(`[+] Created/retrieved conversation with user ${otherUserId}`);

        // Return conversation object
        return response.data.conversation;
    } catch (error) {
        // Log the error
        console.error('[!] Error creating conversation:', error);
        throw error;
    }
};

/**
 * Get conversation details with participants
 * @param conversationId - ID of the conversation
 * @returns Conversation details object
 */
const getConversationDetails = async (conversationId: number): Promise<ConversationDetails> => {
    try {
        // GET request to /api/chat/conversations/:conversationId
        const response = await api.get(`/api/chat/conversations/${conversationId}`);

        // Log the response
        console.log(`[+] Fetched conversation details: ${conversationId}`);

        // Return conversation object
        return response.data.conversation;
    } catch (error) {
        // Log the error
        console.error('[!] Error fetching conversation details:', error);
        throw error;
    }
};

// ============================================================================
// MESSAGE API CALLS
// ============================================================================

/**
 * Get messages for a conversation with pagination
 * @param conversationId - ID of the conversation
 * @param limit - Maximum number of messages to fetch (default 50)
 * @param offset - Number of messages to skip (default 0)
 * @returns Array of messages with sender info
 */
const getConversationMessages = async (
    conversationId: number,
    limit: number = 50,
    offset: number = 0
): Promise<MessageResponse[]> => {
    try {
        // GET request to /api/chat/conversations/:conversationId/messages
        const response = await api.get(
            `/api/chat/conversations/${conversationId}/messages`,
            { params: { limit, offset } }
        );

        // Log the response
        console.log(`[+] Fetched ${response.data.messages.length} messages for conversation ${conversationId}`);

        // Return messages array (backend returns DESC, will be reversed in store)
        return response.data.messages;
    } catch (error) {
        // Log the error
        console.error('[!] Error fetching messages:', error);
        throw error;
    }
};

/**
 * Send a new message in a conversation
 * @param conversationId - ID of the conversation
 * @param messageData - Message content and metadata
 * @returns Created message object
 */
const sendMessage = async (
    conversationId: number,
    messageData: SendMessageRequest
): Promise<MessageResponse> => {
    try {
        // POST request to /api/chat/conversations/:conversationId/messages
        const response = await api.post(
            `/api/chat/conversations/${conversationId}/messages`,
            messageData
        );

        // Log the response
        console.log(`[+] Sent message to conversation ${conversationId}`);

        // Return created message
        return response.data.message;
    } catch (error) {
        // Log the error
        console.error('[!] Error sending message:', error);
        throw error;
    }
};

/**
 * Edit an existing message (only by sender)
 * @param messageId - ID of the message to edit
 * @param newContent - New content for the message
 * @returns Updated message object
 */
const editMessage = async (messageId: number, newContent: string): Promise<MessageResponse> => {
    try {
        // PATCH request to /api/chat/messages/:messageId
        const response = await api.patch(`/api/chat/messages/${messageId}`, {
            content: newContent
        });

        // Log the response
        console.log(`[+] Edited message ${messageId}`);

        // Return updated message
        return response.data.message;
    } catch (error) {
        // Log the error
        console.error('[!] Error editing message:', error);
        throw error;
    }
};

/**
 * Delete a message (soft delete, only by sender)
 * @param messageId - ID of the message to delete
 * @returns Success status
 */
const deleteMessage = async (messageId: number): Promise<boolean> => {
    try {
        // DELETE request to /api/chat/messages/:messageId
        const response = await api.delete(`/api/chat/messages/${messageId}`);

        // Log the response
        console.log(`[+] Deleted message ${messageId}`);

        // Return success status
        return response.data.success;
    } catch (error) {
        // Log the error
        console.error('[!] Error deleting message:', error);
        throw error;
    }
};

// ============================================================================
// READ RECEIPT API CALLS
// ============================================================================

/**
 * Mark conversation as read (update last_read_at timestamp)
 * @param conversationId - ID of the conversation
 * @returns Success status
 */
const markConversationAsRead = async (conversationId: number): Promise<boolean> => {
    try {
        // POST request to /api/chat/conversations/:conversationId/read
        const response = await api.post(`/api/chat/conversations/${conversationId}/read`);

        // Log the response
        console.log(`[+] Marked conversation ${conversationId} as read`);

        // Return success status
        return response.data.success;
    } catch (error) {
        // Log the error
        console.error('[!] Error marking conversation as read:', error);
        throw error;
    }
};

/**
 * Get total unread message count across all conversations
 * @returns Total unread count
 */
const getTotalUnreadCount = async (): Promise<number> => {
    try {
        // GET request to /api/chat/unread-count
        const response = await api.get('/api/chat/unread-count');

        // Log the response
        console.log(`[+] Total unread count: ${response.data.unreadCount}`);

        // Return unread count
        return response.data.unreadCount;
    } catch (error) {
        // Log the error
        console.error('[!] Error fetching unread count:', error);
        throw error;
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
    getUserConversations,
    createOrGetConversation,
    getConversationDetails,
    getConversationMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    markConversationAsRead,
    getTotalUnreadCount,
};
