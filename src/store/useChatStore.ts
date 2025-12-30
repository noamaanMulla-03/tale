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

    // Set user online status
    setUserOnline: (userId: number) => void;

    // Set user offline status
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
const convertConversationToContact = (conv: ConversationResponse): Contact => {
    // Determine if this is a group or direct conversation
    const isGroup = conv.conversation_type === 'group';

    return {
        // ID field: for groups use conversation_id, for direct use other_user_id
        id: isGroup ? conv.conversation_id : (conv.other_user_id ?? 0),
        conversationId: conv.conversation_id,
        conversationType: conv.conversation_type as 'direct' | 'group',

        // For direct messages: Use other user's info
        // For groups: Use placeholder values (will be overridden by group fields)
        name: isGroup ? (conv.group_name || 'Unnamed Group') : (conv.other_display_name ?? 'Unknown'),
        username: isGroup ? '' : (conv.other_username ?? ''),
        avatar: isGroup
            ? (conv.group_avatar || '/default-group-avatar.png')
            : (conv.other_avatar_url || '/default-avatar.png'),

        // Group-specific fields
        groupName: conv.group_name,
        groupAvatar: conv.group_avatar,
        groupDescription: conv.group_description,
        groupCreatorId: conv.group_creator_id,
        participantCount: conv.participant_count,

        // Common fields
        lastMessage: conv.last_message_content || '',
        timestamp: conv.last_message_time || conv.updated_at,
        unread: conv.unread_count,

        // Online status (only meaningful for direct messages)
        online: false, // Will be updated via WebSocket
    };
};

/**
 * Convert API message response to Message type
 */
const convertMessageResponseToMessage = (msg: MessageResponse): Message => {
    return {
        id: msg.id,
        senderId: msg.sender_id,
        senderName: msg.sender_display_name,
        senderAvatar: msg.sender_avatar_url || '/default-avatar.png',
        content: msg.content || '',
        timestamp: msg.created_at,
        read: true, // Assume read if we're viewing it
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

            console.log(`[+] Loaded ${messages.length} messages for conversation ${conversationId}`);
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
            const sentMessage = await sendMessageAPI(conversationId, messageData);

            // Convert to Message type
            const message = convertMessageResponseToMessage(sentMessage);

            // Add message to state (optimistic update)
            get().addMessage(conversationId, message);

            // Update conversation's last message and timestamp in sidebar
            get().updateConversation(conversationId, {
                lastMessage: message.content,
                timestamp: message.timestamp,
            });

            console.log(`[+] Sent message to conversation ${conversationId}`);
        } catch (error) {
            console.error('[!] Error sending message:', error);
            throw error;
        } finally {
            // Clear sending state
            set({ isSendingMessage: false });
        }
    },

    addMessage: (conversationId, message) => {
        set((state) => {
            // Get existing messages for this conversation
            const existingMessages = state.messages[conversationId] || [];

            // Check if message already exists (prevent duplicates)
            const messageExists = existingMessages.some(m => m.id === message.id);
            if (messageExists) {
                return state;
            }

            // Add new message to end of array
            return {
                messages: {
                    ...state.messages,
                    [conversationId]: [...existingMessages, message]
                }
            };
        });

        // Update conversation in sidebar with new last message
        get().updateConversation(conversationId, {
            lastMessage: message.content,
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

            console.log(`[+] Marked conversation ${conversationId} as read`);
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
            const newOnlineUsers = new Set(state.onlineUsers);
            newOnlineUsers.add(userId);
            return { onlineUsers: newOnlineUsers };
        });

        // Update conversations to reflect online status
        set((state) => ({
            conversations: state.conversations.map(conv =>
                conv.id === userId ? { ...conv, online: true } : conv
            )
        }));
    },

    setUserOffline: (userId) => {
        set((state) => {
            const newOnlineUsers = new Set(state.onlineUsers);
            newOnlineUsers.delete(userId);
            return { onlineUsers: newOnlineUsers };
        });

        // Update conversations to reflect offline status
        set((state) => ({
            conversations: state.conversations.map(conv =>
                conv.id === userId ? { ...conv, online: false } : conv
            )
        }));
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
