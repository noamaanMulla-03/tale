// ============================================================================
// CHAT TYPE DEFINITIONS
// ============================================================================
// Type definitions for chat functionality
// Updated to match backend API responses and database schema
// Includes support for both direct messages (1-on-1) and group chats
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
    messageType?: 'text' | 'image' | 'file' | 'voice' | 'video' | 'audio'; // Alias for compatibility

    // File attachment data (for non-text messages)
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;

    // Edit tracking
    isEdited?: boolean;
}

/**
 * Conversation type enum
 */
export type ConversationType = 'direct' | 'group';

/**
 * Contact type - represents a conversation in the sidebar
 * UPDATED: Now supports both direct messages and group chats
 * 
 * For direct messages:
 * - Uses `name`, `username`, `avatar` from other user
 * - `conversationType` is 'direct'
 * - `participantCount` is 2
 * 
 * For group chats:
 * - Uses `groupName`, `groupAvatar`
 * - `conversationType` is 'group'
 * - `participantCount` > 2
 * - `groupDescription` and `groupCreatorId` available
 */
export interface Contact {
    // User/Group ID
    id: number;

    // Conversation ID for API calls
    conversationId: number;

    // Conversation type: 'direct' or 'group'
    conversationType: ConversationType;

    // For direct messages: Other user's information
    name: string;
    username: string;
    avatar: string;

    // For group chats: Group information
    groupName?: string | null;
    groupAvatar?: string | null;
    groupDescription?: string | null;
    groupCreatorId?: number | null;

    // Number of participants (2 for direct, >2 for groups)
    participantCount: number;

    // Last message preview
    lastMessage: string;
    timestamp: string; // ISO date string

    // Unread count
    unread: number;

    // Online status (updated via WebSocket) - only for direct messages
    online: boolean;
}

/**
 * Group participant information
 */
export interface GroupParticipant {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    joinedAt: string; // ISO date string
    isAdmin: boolean; // true if user is group creator
}

/**
 * Typing indicator - tracks who is currently typing
 */
export interface TypingIndicator {
    userId: number;
    username: string;
    conversationId: number;
}

/**
 * Request body for creating a group
 */
export interface CreateGroupRequest {
    name: string;
    description?: string;
    participantIds: number[];
    avatarUrl?: string;
}

/**
 * Request body for updating group details
 */
export interface UpdateGroupRequest {
    name?: string;
    description?: string;
    avatarUrl?: string;
}

/**
 * Request body for adding group members
 */
export interface AddGroupMembersRequest {
    userIds: number[];
}
