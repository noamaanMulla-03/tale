// ============================================================================
// CHAT STORE - Zustand store for managing chat state
// ============================================================================
// Manages conversations, messages, typing indicators, and online status
// Integrates with WebSocket for real-time updates and API for data fetching
// ============================================================================

// Import zustand to create store
import { create } from 'zustand';

// Import chat API service functions
import {
    getUserConversations,
    getConversationMessages,
    sendMessage as sendMessageAPI,
    markConversationAsRead,
    ConversationResponse,
    MessageResponse,
    SendMessageRequest,
} from '@/features/chat/services/chat';

// Import types
import { Contact, Message } from '@/types/chat';

// Import WebRTC utilities
import { CallInfo } from '@/lib/webrtc';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Typing indicator state for a user in a conversation
 */
interface TypingIndicator {
    userId: number;
    username: string;
    conversationId: number;
}

/**
 * Chat store state interface
 */
interface ChatState {
    // ========================================================================
    // STATE
    // ========================================================================

    // Array of conversations (contacts in sidebar)
    conversations: Contact[];

    // Messages grouped by conversation ID
    // Format: { conversationId: Message[] }
    messages: Record<number, Message[]>;

    // Currently selected conversation ID
    selectedConversationId: number | null;

    // Loading states
    isLoadingConversations: boolean;
    isLoadingMessages: boolean;
    isSendingMessage: boolean;

    // Typing indicators (array of users currently typing)
    typingUsers: TypingIndicator[];

    // Online user IDs (for showing online status)
    onlineUsers: Set<number>;

    // Total unread message count across all conversations
    totalUnreadCount: number;

    // ========================================================================
    // VIDEO CALL STATE
    // ========================================================================

    // Current active call information (null when no call)
    currentCall: CallInfo | null;

    // Set current call (when call starts)
    setCurrentCall: (callInfo: CallInfo | null) => void;

    // Get current call
    getCurrentCall: () => CallInfo | null;

    // ========================================================================
    // CONVERSATION ACTIONS
    // ========================================================================

    // Fetch all conversations from API
    fetchConversations: () => Promise<void>;

    // Set selected conversation
    setSelectedConversation: (conversationId: number | null) => void;

    // Get conversation by ID from state
    getConversation: (conversationId: number) => Contact | undefined;

    // Update conversation in state (for optimistic updates)
    updateConversation: (conversationId: number, updates: Partial<Contact>) => void;

    // ========================================================================
    // MESSAGE ACTIONS
    // ========================================================================

    // Fetch messages for a conversation from API
    fetchMessages: (conversationId: number) => Promise<void>;

    // Send a new message
    sendMessage: (conversationId: number, messageData: SendMessageRequest) => Promise<void>;

    // Add message to state (for real-time updates via WebSocket)
    addMessage: (conversationId: number, message: Message) => void;

    // Update message in state (for edit via WebSocket)
    updateMessage: (conversationId: number, messageId: number, updates: Partial<Message>) => void;

    // Remove message from state (for delete via WebSocket)
    removeMessage: (conversationId: number, messageId: number) => void;

    // Mark conversation as read
    markAsRead: (conversationId: number) => Promise<void>;

    // ========================================================================
    // TYPING INDICATOR ACTIONS
    // ========================================================================

    // Add typing user
    addTypingUser: (userId: number, username: string, conversationId: number) => void;

    // Remove typing user
    removeTypingUser: (userId: number, conversationId: number) => void;

    // Get typing users for a conversation
    getTypingUsers: (conversationId: number) => TypingIndicator[];

    // ========================================================================
    // ONLINE STATUS ACTIONS
    // ========================================================================

    // Mark a user as online and update their conversations
    setUserOnline: (userId: number) => void;

    // Mark multiple users as online (bulk update for initial online users list)
    setUsersOnline: (userIds: number[]) => void;

    // Mark a user as offline and update their conversations
    setUserOffline: (userId: number) => void;

    // Check if user is online
    isUserOnline: (userId: number) => boolean;

    // ========================================================================
    // UTILITY ACTIONS
    // ========================================================================

    // Clear all chat data (on logout)
    clearChatData: () => void;

    // Update total unread count
    updateUnreadCount: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert API conversation response to Contact type
 * UPDATED: Now handles both direct messages and group chats
 * 
 * For direct messages:
 * - Uses other user's name, username, avatar
 * - conversationType is 'direct'
 * 
 * For group chats:
 * - Uses group name and avatar
 * - conversationType is 'group'
 * - Includes participant count, description, creator ID
 */
/**
 * Convert API conversation response to Contact type for frontend use
 * 
 * Handles both conversation types:
 * 1. Direct messages (1-on-1 chat)
 *    - Uses other user's name, avatar, username
 *    - conversationType: 'direct'
 * 
 * 2. Group chats (multi-user conversation)
 *    - Uses group name, avatar, description
 *    - conversationType: 'group'
 *    - Includes participant count and creator info
 * 
 * @param conv - Conversation data from backend API
 * @returns Contact object optimized for frontend rendering in sidebar
 */
const convertConversationToContact = (conv: ConversationResponse): Contact => {
    const isGroup = conv.conversation_type === 'group';

    // Ensure timestamp is always valid for proper sorting and display
    // Priority: last_message_time > updated_at > current time
    const timestamp = conv.last_message_time || conv.updated_at || new Date().toISOString();

    return {
        // Unique identifier: conversation_id for groups, other_user_id for direct
        id: isGroup ? conv.conversation_id : (conv.other_user_id ?? 0),
        conversationId: conv.conversation_id,
        conversationType: conv.conversation_type as 'direct' | 'group',

        // Display info: varies based on conversation type
        name: isGroup ? (conv.group_name || 'Unnamed Group') : (conv.other_display_name ?? 'Unknown'),
        username: isGroup ? '' : (conv.other_username ?? ''),
        avatar: isGroup
            ? (conv.group_avatar || '/default-group-avatar.png')
            : (conv.other_avatar_url || '/default-avatar.png'),

        // Group-specific fields (null for direct messages)
        groupName: conv.group_name,
        groupAvatar: conv.group_avatar,
        groupDescription: conv.group_description,
        groupCreatorId: conv.group_creator_id,
        participantCount: conv.participant_count,

        // Common fields for both types
        lastMessage: conv.last_message_content || '',
        timestamp: timestamp,
        unread: conv.unread_count,

        // Online status (only relevant for direct messages)
        online: false, // Will be updated via WebSocket events
    };
};

/**
 * Convert API message response to Message type for frontend use
 * 
 * Transforms backend database format to frontend display format:
 * - snake_case → camelCase field names
 * - created_at → timestamp
 * - sender_id → senderId
 * - etc.
 * 
 * @param msg - Message data from backend API in MessageResponse format
 * @returns Message object optimized for frontend rendering
 */
const convertMessageResponseToMessage = (msg: MessageResponse): Message => {
    return {
        id: msg.id,
        senderId: msg.sender_id,
        senderName: msg.sender_display_name,
        senderAvatar: msg.sender_avatar_url || '/default-avatar.png',
        content: msg.content || '',
        timestamp: msg.created_at,
        read: true, // Assume read if user is viewing the conversation
        type: msg.message_type,
        fileUrl: msg.file_url,
        fileName: msg.file_name,
        isEdited: msg.is_edited,
    };
};

// ============================================================================
// CHAT STORE
// ============================================================================

const useChatStore = create<ChatState>((set, get) => ({
    // ========================================================================
    // INITIAL STATE
    // ========================================================================

    conversations: [],
    messages: {},
    selectedConversationId: null,
    isLoadingConversations: false,
    isLoadingMessages: false,
    isSendingMessage: false,
    typingUsers: [],
    onlineUsers: new Set(),
    totalUnreadCount: 0,
    currentCall: null, // No active call initially

    // ========================================================================
    // VIDEO CALL ACTIONS
    // ========================================================================

    /**
     * Set current active call
     * @param callInfo - Call information or null to clear
     */
    setCurrentCall: (callInfo) => {
        console.log('[ChatStore] Setting current call:', callInfo);
        set({ currentCall: callInfo });
    },

    /**
     * Get current active call
     * @returns Current call info or null
     */
    getCurrentCall: () => {
        return get().currentCall;
    },

    // ========================================================================
    // CONVERSATION ACTIONS IMPLEMENTATION
    // ========================================================================

    fetchConversations: async () => {
        // Set loading state
        set({ isLoadingConversations: true });

        try {
            // Fetch conversations from API
            const conversationsData = await getUserConversations();

            // Convert to Contact type and update state
            const contacts = conversationsData.map(convertConversationToContact);

            // Update state with conversations
            set({ conversations: contacts });

            // Calculate total unread count
            const totalUnread = contacts.reduce((sum, conv) => sum + conv.unread, 0);
            set({ totalUnreadCount: totalUnread });

            console.log(`[+] Loaded ${contacts.length} conversations`);
        } catch (error) {
            console.error('[!] Error fetching conversations:', error);
            throw error;
        } finally {
            // Clear loading state
            set({ isLoadingConversations: false });
        }
    },

    setSelectedConversation: (conversationId) => {
        set({ selectedConversationId: conversationId });

        // If selecting a conversation, mark it as read
        if (conversationId !== null) {
            get().markAsRead(conversationId);
        }
    },

    getConversation: (conversationId) => {
        const conversations = get().conversations;
        return conversations.find(conv => conv.conversationId === conversationId);
    },

    updateConversation: (conversationId, updates) => {
        set((state) => ({
            conversations: state.conversations.map(conv =>
                conv.conversationId === conversationId
                    ? { ...conv, ...updates }
                    : conv
            )
        }));
    },

    // ========================================================================
    // MESSAGE ACTIONS IMPLEMENTATION
    // ========================================================================

    fetchMessages: async (conversationId) => {
        // Set loading state
        set({ isLoadingMessages: true });

        try {
            // Fetch messages from API
            const messagesData = await getConversationMessages(conversationId);

            // Convert to Message type (API returns DESC, reverse for ASC display)
            const messages = messagesData.reverse().map(convertMessageResponseToMessage);

            // Update state with messages for this conversation
            set((state) => ({
                messages: {
                    ...state.messages,
                    [conversationId]: messages
                }
            }));
        } catch (error) {
            console.error('[!] Error fetching messages:', error);
            throw error;
        } finally {
            // Clear loading state
            set({ isLoadingMessages: false });
        }
    },

    sendMessage: async (conversationId, messageData) => {
        // Set sending state
        set({ isSendingMessage: true });

        try {
            // Send message via API
            // Note: We don't add the message here - the WebSocket event will handle it
            // This ensures all clients (including sender) receive messages in the same way
            await sendMessageAPI(conversationId, messageData);
        } catch (error) {
            console.error('[!] Error sending message:', error);
            throw error;
        } finally {
            // Clear sending state
            set({ isSendingMessage: false });
        }
    },

    addMessage: (conversationId, message) => {
        // Add new message to the messages array for this conversation
        set((state) => {
            const existingMessages = state.messages[conversationId] || [];

            // Check if message already exists (prevent duplicates)
            // This is crucial since WebSocket events might be received multiple times
            const messageExists = existingMessages.some(m => m.id === message.id);
            if (messageExists) {
                console.log(`[ChatStore] Duplicate message ${message.id} ignored for conversation ${conversationId}`);
                return state; // No change if duplicate
            }

            // Create a new array with the new message appended
            // Messages are in chronological order (oldest first)
            const updatedMessages = [...existingMessages, message];

            console.log(`[ChatStore] Adding message ${message.id} to conversation ${conversationId}. Total messages: ${updatedMessages.length}`);

            // Create new messages object to ensure state update triggers re-render
            const newMessagesState = {
                ...state.messages,
                [conversationId]: updatedMessages
            };

            return {
                messages: newMessagesState
            };
        });

        // Update conversation in sidebar with new last message and timestamp
        // This keeps the conversation list showing the latest message preview
        get().updateConversation(conversationId, {
            lastMessage: message.content || '[File]',
            timestamp: message.timestamp,
        });
    },

    updateMessage: (conversationId, messageId, updates) => {
        set((state) => {
            const conversationMessages = state.messages[conversationId];
            if (!conversationMessages) return state;

            return {
                messages: {
                    ...state.messages,
                    [conversationId]: conversationMessages.map(msg =>
                        msg.id === messageId ? { ...msg, ...updates } : msg
                    )
                }
            };
        });
    },

    removeMessage: (conversationId, messageId) => {
        set((state) => {
            const conversationMessages = state.messages[conversationId];
            if (!conversationMessages) return state;

            return {
                messages: {
                    ...state.messages,
                    [conversationId]: conversationMessages.filter(msg => msg.id !== messageId)
                }
            };
        });
    },

    markAsRead: async (conversationId) => {
        try {
            // Call API to mark as read
            await markConversationAsRead(conversationId);

            // Update conversation unread count to 0
            get().updateConversation(conversationId, { unread: 0 });

            // Recalculate total unread count
            get().updateUnreadCount();
        } catch (error) {
            console.error('[!] Error marking conversation as read:', error);
            // Don't throw - this is a background operation
        }
    },

    // ========================================================================
    // TYPING INDICATOR ACTIONS IMPLEMENTATION
    // ========================================================================

    addTypingUser: (userId, username, conversationId) => {
        set((state) => {
            // Check if user is already in typing array
            const exists = state.typingUsers.some(
                u => u.userId === userId && u.conversationId === conversationId
            );

            if (exists) return state;

            // Add new typing user
            return {
                typingUsers: [
                    ...state.typingUsers,
                    { userId, username, conversationId }
                ]
            };
        });
    },

    removeTypingUser: (userId, conversationId) => {
        set((state) => ({
            typingUsers: state.typingUsers.filter(
                u => !(u.userId === userId && u.conversationId === conversationId)
            )
        }));
    },

    getTypingUsers: (conversationId) => {
        return get().typingUsers.filter(u => u.conversationId === conversationId);
    },

    // ========================================================================
    // ONLINE STATUS ACTIONS IMPLEMENTATION
    // ========================================================================

    setUserOnline: (userId) => {
        set((state) => {
            // Add user to online users set
            const newOnlineUsers = new Set(state.onlineUsers);
            newOnlineUsers.add(userId);

            // Update conversations to reflect online status
            // For DIRECT conversations: conv.id is the OTHER user's ID
            // So we check if conv.id (other user) matches the userId that came online
            const updatedConversations = state.conversations.map(conv => {
                // Only update direct message conversations (not groups)
                if (conv.conversationType === 'direct' && conv.id === userId) {
                    return { ...conv, online: true };
                }
                return conv;
            });

            console.log(`[ChatStore] User ${userId} is now online. Updated ${updatedConversations.filter(c => c.online && c.conversationType === 'direct').length} direct conversations.`);

            return { 
                onlineUsers: newOnlineUsers,
                conversations: updatedConversations
            };
        });
    },

    setUsersOnline: (userIds) => {
        set((state) => {
            // Add all users to online users set
            const newOnlineUsers = new Set(state.onlineUsers);
            userIds.forEach(id => newOnlineUsers.add(id));

            // Update conversations to reflect online status for all users
            const updatedConversations = state.conversations.map(conv => {
                // Only update direct message conversations where the other user is in the online list
                if (conv.conversationType === 'direct' && userIds.includes(conv.id)) {
                    return { ...conv, online: true };
                }
                return conv;
            });

            console.log(`[ChatStore] Received initial online users list: ${userIds.length} users online. Updated ${updatedConversations.filter(c => c.online && c.conversationType === 'direct').length} direct conversations.`);

            return { 
                onlineUsers: newOnlineUsers,
                conversations: updatedConversations
            };
        });
    },

    setUserOffline: (userId) => {
        set((state) => {
            // Remove user from online users set
            const newOnlineUsers = new Set(state.onlineUsers);
            newOnlineUsers.delete(userId);

            // Update conversations to reflect offline status
            // For DIRECT conversations: conv.id is the OTHER user's ID
            // So we check if conv.id (other user) matches the userId that went offline
            const updatedConversations = state.conversations.map(conv => {
                // Only update direct message conversations (not groups)
                if (conv.conversationType === 'direct' && conv.id === userId) {
                    return { ...conv, online: false };
                }
                return conv;
            });

            console.log(`[ChatStore] User ${userId} is now offline. Updated ${updatedConversations.filter(c => !c.online && c.conversationType === 'direct').length} direct conversations.`);

            return { 
                onlineUsers: newOnlineUsers,
                conversations: updatedConversations
            };
        });
    },

    isUserOnline: (userId) => {
        return get().onlineUsers.has(userId);
    },

    // ========================================================================
    // UTILITY ACTIONS IMPLEMENTATION
    // ========================================================================

    clearChatData: () => {
        // Reset all state to initial values
        set({
            conversations: [],
            messages: {},
            selectedConversationId: null,
            isLoadingConversations: false,
            isLoadingMessages: false,
            isSendingMessage: false,
            typingUsers: [],
            onlineUsers: new Set(),
            totalUnreadCount: 0,
        });

        console.log('[+] Cleared all chat data');
    },

    updateUnreadCount: () => {
        const conversations = get().conversations;
        const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread, 0);
        set({ totalUnreadCount: totalUnread });
    },
}));

// Export the store
export default useChatStore;
