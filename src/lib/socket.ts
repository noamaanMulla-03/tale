// ============================================================================
// WEBSOCKET CLIENT - Socket.IO client for real-time chat
// ============================================================================
// Manages WebSocket connection lifecycle and provides event handlers
// Singleton pattern ensures only one connection across the app
// ============================================================================

import { io, Socket } from 'socket.io-client';
import API_URL from '@/config';
import { Message } from '@/types/chat';

// ============================================================================
// SOCKET INSTANCE
// ============================================================================

// Socket.IO client instance (singleton)
// Initialized when connectSocket is called
let socket: Socket | null = null;

// Get the WebSocket URL from API_URL
// Example: http://localhost:3000 -> http://localhost:3000
const SOCKET_URL = API_URL;

// ============================================================================
// CONNECTION MANAGEMENT
// ============================================================================

/**
 * Initialize and connect to Socket.IO server
 * Should be called after user authentication
 * @param userId - Authenticated user's ID for room joining
 */
export const connectSocket = (userId: number): void => {
    // Prevent multiple connections
    if (socket?.connected) {
        console.log('[+] Socket already connected');
        return;
    }

    // Create socket connection with configuration
    socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
        reconnection: true,                    // Enable auto-reconnection
        reconnectionDelay: 1000,               // Wait 1s before reconnecting
        reconnectionAttempts: 5,               // Max 5 reconnection attempts
        timeout: 20000,                        // Connection timeout
    });

    // ========================================================================
    // CONNECTION EVENTS
    // ========================================================================

    // Connection established
    socket.on('connect', () => {
        console.log(`[+] Socket connected: ${socket?.id}`);

        // Authenticate socket with user ID
        // Server will join user to their personal room (user_123)
        socket?.emit('authenticate', userId);

        // Emit online status
        socket?.emit('online');
    });

    // Connection error
    socket.on('connect_error', (error) => {
        console.error('[-] Socket connection error:', error.message);
    });

    // Disconnection
    socket.on('disconnect', (reason) => {
        console.log(`[-] Socket disconnected: ${reason}`);

        // If disconnected due to server shutdown or network, try to reconnect
        if (reason === 'io server disconnect') {
            // Server initiated disconnect, manual reconnection needed
            socket?.connect();
        }
    });

    // Reconnection attempt
    socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`[+] Reconnection attempt ${attemptNumber}`);
    });

    // Reconnection successful
    socket.on('reconnect', (attemptNumber) => {
        console.log(`[+] Reconnected after ${attemptNumber} attempts`);

        // Re-authenticate after reconnection
        socket?.emit('authenticate', userId);
        socket?.emit('online');
    });

    // Reconnection failed after max attempts
    socket.on('reconnect_failed', () => {
        console.error('[-] Reconnection failed after max attempts');
    });
};

/**
 * Disconnect from Socket.IO server
 * Should be called on logout
 */
export const disconnectSocket = (): void => {
    if (socket) {
        console.log('[-] Disconnecting socket');
        socket.disconnect();
        socket = null;
    }
};

/**
 * Get current socket connection status
 * @returns Boolean indicating if socket is connected
 */
export const isSocketConnected = (): boolean => {
    return socket?.connected ?? false;
};

/**
 * Get socket instance (for advanced usage)
 * @returns Socket instance or null if not connected
 */
export const getSocket = (): Socket | null => {
    return socket;
};

// ============================================================================
// CONVERSATION MANAGEMENT
// ============================================================================

/**
 * Join a conversation room to receive real-time updates
 * Call this when user opens a conversation
 * @param conversationId - ID of the conversation to join
 */
export const joinConversation = (conversationId: number): void => {
    if (!socket?.connected) {
        console.error('[-] Cannot join conversation: Socket not connected');
        return;
    }

    socket.emit('join_conversation', conversationId);
    console.log(`[+] Joined conversation: ${conversationId}`);
};

/**
 * Leave a conversation room
 * Call this when user navigates away from conversation
 * @param conversationId - ID of the conversation to leave
 */
export const leaveConversation = (conversationId: number): void => {
    if (!socket?.connected) {
        return;
    }

    socket.emit('leave_conversation', conversationId);
    console.log(`[+] Left conversation: ${conversationId}`);
};

// ============================================================================
// TYPING INDICATORS
// ============================================================================

/**
 * Emit typing event to notify others in conversation
 * @param conversationId - ID of the conversation
 * @param username - Current user's username/display name
 */
export const emitTyping = (conversationId: number, username: string): void => {
    if (!socket?.connected) {
        return;
    }

    socket.emit('typing', { conversationId, username });
};

/**
 * Emit stop typing event
 * @param conversationId - ID of the conversation
 */
export const emitStopTyping = (conversationId: number): void => {
    if (!socket?.connected) {
        return;
    }

    socket.emit('stop_typing', { conversationId });
};

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Listen for new messages in conversations
 * @param callback - Function to call when new message arrives
 * @returns Cleanup function to remove listener
 */
export const onNewMessage = (
    callback: (data: { conversationId: number; message: Message }) => void
): (() => void) => {
    if (!socket) {
        console.error('[-] Cannot add listener: Socket not initialized');
        return () => { };
    }

    socket.on('new_message', callback);

    // Return cleanup function
    return () => {
        socket?.off('new_message', callback);
    };
};

/**
 * Listen for message edits
 * @param callback - Function to call when message is edited
 * @returns Cleanup function to remove listener
 */
export const onMessageEdited = (
    callback: (data: { conversationId: number; message: Message }) => void
): (() => void) => {
    if (!socket) {
        return () => { };
    }

    socket.on('message_edited', callback);

    return () => {
        socket?.off('message_edited', callback);
    };
};

/**
 * Listen for message deletions
 * @param callback - Function to call when message is deleted
 * @returns Cleanup function to remove listener
 */
export const onMessageDeleted = (
    callback: (data: { conversationId: number; messageId: number }) => void
): (() => void) => {
    if (!socket) {
        return () => { };
    }

    socket.on('message_deleted', callback);

    return () => {
        socket?.off('message_deleted', callback);
    };
};

/**
 * Listen for read receipts (when other user reads messages)
 * @param callback - Function to call when messages are read
 * @returns Cleanup function to remove listener
 */
export const onMessagesRead = (
    callback: (data: { conversationId: number; userId: number; readAt: string }) => void
): (() => void) => {
    if (!socket) {
        return () => { };
    }

    socket.on('messages_read', callback);

    return () => {
        socket?.off('messages_read', callback);
    };
};

/**
 * Listen for typing indicators
 * @param callback - Function to call when user starts typing
 * @returns Cleanup function to remove listener
 */
export const onUserTyping = (
    callback: (data: { conversationId: number; username: string; userId: number }) => void
): (() => void) => {
    if (!socket) {
        return () => { };
    }

    socket.on('user_typing', callback);

    return () => {
        socket?.off('user_typing', callback);
    };
};

/**
 * Listen for stop typing indicators
 * @param callback - Function to call when user stops typing
 * @returns Cleanup function to remove listener
 */
export const onUserStopTyping = (
    callback: (data: { conversationId: number; userId: number }) => void
): (() => void) => {
    if (!socket) {
        return () => { };
    }

    socket.on('user_stop_typing', callback);

    return () => {
        socket?.off('user_stop_typing', callback);
    };
};

/**
 * Listen for user online status
 * @param callback - Function to call when user comes online
 * @returns Cleanup function to remove listener
 */
export const onUserOnline = (
    callback: (data: { userId: number }) => void
): (() => void) => {
    if (!socket) {
        return () => { };
    }

    socket.on('user_online', callback);

    return () => {
        socket?.off('user_online', callback);
    };
};

/**
 * Listen for user offline status
 * @param callback - Function to call when user goes offline
 * @returns Cleanup function to remove listener
 */
export const onUserOffline = (
    callback: (data: { userId: number }) => void
): (() => void) => {
    if (!socket) {
        return () => { };
    }

    socket.on('user_offline', callback);

    return () => {
        socket?.off('user_offline', callback);
    };
};

// ============================================================================
// USAGE EXAMPLE
// ============================================================================
// 
// import { connectSocket, onNewMessage, joinConversation } from '@/lib/socket';
// 
// // On login
// connectSocket(user.id);
// 
// // Listen for new messages (in component)
// useEffect(() => {
//     const cleanup = onNewMessage((data) => {
//         console.log('New message:', data.message);
//         // Update UI with new message
//     });
//     
//     return cleanup; // Remove listener on unmount
// }, []);
// 
// // Join conversation when opening chat
// joinConversation(123);
// 
// // On logout
// disconnectSocket();
//
// ============================================================================
