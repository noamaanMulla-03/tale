// ============================================================================
// CHAT TYPE DEFINITIONS
// ============================================================================
// Type definitions for chat functionality
// Updated to match backend API responses and database schema
// ============================================================================

/**
 * Message type - represents a single chat message
 * Maps to messages table in database
 */
export interface Message {
    // Message ID from database
    id: number;

    // Sender information
    senderId: number;
    senderName: string;
    senderAvatar: string;

    // Message content and metadata
    content: string;
    timestamp: string; // ISO date string
    read: boolean;

    // Message type (text, image, file, voice)
    type: 'text' | 'image' | 'file' | 'voice';

    // File attachment data (for non-text messages)
    fileUrl?: string | null;
    fileName?: string | null;

    // Edit tracking
    isEdited?: boolean;
}

/**
 * Contact type - represents a conversation in the sidebar
 * Contains other participant info and last message preview
 */
export interface Contact {
    // Other user's ID
    id: number;

    // Conversation ID for API calls
    conversationId: number;

    // Other user's information
    name: string;
    username: string;
    avatar: string;

    // Last message preview
    lastMessage: string;
    timestamp: string; // ISO date string

    // Unread count
    unread: number;

    // Online status (updated via WebSocket)
    online: boolean;
}

/**
 * Typing indicator - tracks who is currently typing
 */
export interface TypingIndicator {
    userId: number;
    username: string;
    conversationId: number;
}
