// Type definitions for chat functionality

// Interface for a chat message
export interface Message {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    timestamp: Date;
    isRead: boolean;
    // For distinguishing sent vs received messages
    isSent: boolean;
}

// Interface for a contact/conversation
export interface Contact {
    id: string;
    name: string;
    username: string;
    avatar?: string;
    lastMessage: string;
    lastMessageTime: Date;
    unreadCount: number;
    isOnline: boolean;
    // User's status - online, away, busy, offline
    status: 'online' | 'away' | 'busy' | 'offline';
}

// Interface for typing indicator
export interface TypingIndicator {
    contactId: string;
    isTyping: boolean;
}
