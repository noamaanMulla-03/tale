// ============================================================================
// CHAT CONTROLLER - Business logic for chat functionality
// ============================================================================
// This module handles HTTP requests for chat operations
// Follows the same pattern as userController.js
// All routes are protected by authenticateToken middleware
// ============================================================================

// Import chat model
import chatModel from "../models/chatModel.js";

// Chat controller object
const chatController = {

    // ========================================================================
    // CONVERSATION ENDPOINTS
    // ========================================================================

    /**
     * GET /api/chat/conversations
     * Get all conversations for the authenticated user
     * Returns: Array of conversations with last message and unread count
     */
    getUserConversations: async (req, res, next) => {
        try {
            // req.user is set by authenticateToken middleware
            const userId = req.user.id;

            // Get conversations from database
            const conversations = await chatModel.getUserConversations(userId);

            // Respond with conversations array
            res.status(200).json({ conversations });
        } catch (err) {
            // Pass errors to error handling middleware
            next(err);
        }
    },

    /**
     * POST /api/chat/conversations
     * Create or get existing conversation with another user
     * Body: { otherUserId: number }
     * Returns: Conversation ID
     */
    createOrGetConversation: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { otherUserId } = req.body;

            // Validation: Check if otherUserId is provided
            if (!otherUserId) {
                return res.status(400).json({ 
                    error: "otherUserId is required" 
                });
            }

            // Validation: User cannot create conversation with themselves
            if (parseInt(otherUserId) === userId) {
                return res.status(400).json({ 
                    error: "Cannot create conversation with yourself" 
                });
            }

            // Get or create conversation
            const conversationId = await chatModel.getOrCreateConversation(userId, otherUserId);

            // Get full conversation details
            const conversation = await chatModel.getConversationDetails(conversationId);

            // Respond with conversation
            res.status(200).json({ conversation });
        } catch (err) {
            // Pass errors to error handling middleware
            next(err);
        }
    },

    /**
     * GET /api/chat/conversations/:conversationId
     * Get conversation details
     * Returns: Conversation object with participants
     */
    getConversationDetails: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { conversationId } = req.params;

            // Authorization: Check if user is participant in this conversation
            const isParticipant = await chatModel.isUserInConversation(userId, conversationId);
            if (!isParticipant) {
                return res.status(403).json({ 
                    error: "You are not a participant in this conversation" 
                });
            }

            // Get conversation details
            const conversation = await chatModel.getConversationDetails(conversationId);

            // Handle case where conversation doesn't exist
            if (!conversation) {
                return res.status(404).json({ 
                    error: "Conversation not found" 
                });
            }

            // Respond with conversation
            res.status(200).json({ conversation });
        } catch (err) {
            // Pass errors to error handling middleware
            next(err);
        }
    },

    // ========================================================================
    // MESSAGE ENDPOINTS
    // ========================================================================

    /**
     * GET /api/chat/conversations/:conversationId/messages
     * Get messages for a conversation with pagination
     * Query params: limit (default 50), offset (default 0)
     * Returns: Array of messages with sender info
     */
    getConversationMessages: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { conversationId } = req.params;
            
            // Parse pagination parameters with defaults
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;

            // Authorization: Check if user is participant
            const isParticipant = await chatModel.isUserInConversation(userId, conversationId);
            if (!isParticipant) {
                return res.status(403).json({ 
                    error: "You are not a participant in this conversation" 
                });
            }

            // Get messages from database
            const messages = await chatModel.getConversationMessages(conversationId, limit, offset);

            // Respond with messages array (will be reversed in frontend for display)
            res.status(200).json({ messages });
        } catch (err) {
            // Pass errors to error handling middleware
            next(err);
        }
    },

    /**
     * POST /api/chat/conversations/:conversationId/messages
     * Send a new message in a conversation
     * Body: { content: string, messageType?: string, fileUrl?: string, fileName?: string, fileSize?: number }
     * Returns: Created message object
     * Note: File upload is handled separately, this receives the uploaded file URL
     */
    sendMessage: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { conversationId } = req.params;
            const { content, messageType = 'text', fileUrl, fileName, fileSize } = req.body;

            // Authorization: Check if user is participant
            const isParticipant = await chatModel.isUserInConversation(userId, conversationId);
            if (!isParticipant) {
                return res.status(403).json({ 
                    error: "You are not a participant in this conversation" 
                });
            }

            // Validation: Content or file must be provided
            if (!content && !fileUrl) {
                return res.status(400).json({ 
                    error: "Message must contain content or a file" 
                });
            }

            // Validation: Check message type is valid
            const validTypes = ['text', 'image', 'file', 'voice'];
            if (!validTypes.includes(messageType)) {
                return res.status(400).json({ 
                    error: `Invalid message type. Must be one of: ${validTypes.join(', ')}` 
                });
            }

            // Create message in database
            const message = await chatModel.createMessage(
                conversationId,
                userId,
                content,
                messageType,
                fileUrl,
                fileName,
                fileSize
            );

            // Get other participants to notify via WebSocket
            const otherParticipants = await chatModel.getOtherParticipants(conversationId, userId);

            // Emit WebSocket event to other participants
            // (Socket.IO instance is attached to req.app in server setup)
            const io = req.app.get('io');
            
            // Send new message event to each participant's room
            otherParticipants.forEach(participantId => {
                io.to(`user_${participantId}`).emit('new_message', {
                    conversationId,
                    message
                });
            });

            // Respond with created message
            res.status(201).json({ message });
        } catch (err) {
            // Pass errors to error handling middleware
            next(err);
        }
    },

    /**
     * PATCH /api/chat/messages/:messageId
     * Edit a message (only by sender)
     * Body: { content: string }
     * Returns: Updated message object
     */
    editMessage: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { messageId } = req.params;
            const { content } = req.body;

            // Validation: Content is required
            if (!content || content.trim() === '') {
                return res.status(400).json({ 
                    error: "Content is required" 
                });
            }

            // Authorization: Check if user owns this message
            const isOwner = await chatModel.isMessageOwnedByUser(messageId, userId);
            if (!isOwner) {
                return res.status(403).json({ 
                    error: "You can only edit your own messages" 
                });
            }

            // Update message
            const updatedMessage = await chatModel.updateMessage(messageId, content);

            // Handle case where message doesn't exist or was deleted
            if (!updatedMessage) {
                return res.status(404).json({ 
                    error: "Message not found or has been deleted" 
                });
            }

            // Get conversation to notify other participants
            const conversationId = updatedMessage.conversation_id;
            const otherParticipants = await chatModel.getOtherParticipants(conversationId, userId);

            // Emit WebSocket event to other participants
            const io = req.app.get('io');
            otherParticipants.forEach(participantId => {
                io.to(`user_${participantId}`).emit('message_edited', {
                    conversationId,
                    message: updatedMessage
                });
            });

            // Respond with updated message
            res.status(200).json({ message: updatedMessage });
        } catch (err) {
            // Pass errors to error handling middleware
            next(err);
        }
    },

    /**
     * DELETE /api/chat/messages/:messageId
     * Delete a message (soft delete, only by sender)
     * Returns: Success status
     */
    deleteMessage: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { messageId } = req.params;

            // Authorization: Check if user owns this message
            const isOwner = await chatModel.isMessageOwnedByUser(messageId, userId);
            if (!isOwner) {
                return res.status(403).json({ 
                    error: "You can only delete your own messages" 
                });
            }

            // Get message details before deleting (for WebSocket notification)
            const message = await chatModel.getMessageById(messageId);
            if (!message) {
                return res.status(404).json({ 
                    error: "Message not found or already deleted" 
                });
            }

            // Soft delete message
            const deleted = await chatModel.deleteMessage(messageId);

            if (!deleted) {
                return res.status(404).json({ 
                    error: "Message not found or already deleted" 
                });
            }

            // Get conversation to notify other participants
            const conversationId = message.conversation_id;
            const otherParticipants = await chatModel.getOtherParticipants(conversationId, userId);

            // Emit WebSocket event to other participants
            const io = req.app.get('io');
            otherParticipants.forEach(participantId => {
                io.to(`user_${participantId}`).emit('message_deleted', {
                    conversationId,
                    messageId: parseInt(messageId)
                });
            });

            // Respond with success
            res.status(200).json({ 
                success: true,
                message: "Message deleted successfully" 
            });
        } catch (err) {
            // Pass errors to error handling middleware
            next(err);
        }
    },

    // ========================================================================
    // READ RECEIPT ENDPOINTS
    // ========================================================================

    /**
     * POST /api/chat/conversations/:conversationId/read
     * Mark conversation as read (update last_read_at to current time)
     * Returns: Success status
     */
    markConversationAsRead: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { conversationId } = req.params;

            // Authorization: Check if user is participant
            const isParticipant = await chatModel.isUserInConversation(userId, conversationId);
            if (!isParticipant) {
                return res.status(403).json({ 
                    error: "You are not a participant in this conversation" 
                });
            }

            // Update last read timestamp
            await chatModel.updateLastRead(userId, conversationId);

            // Get other participants to notify via WebSocket
            const otherParticipants = await chatModel.getOtherParticipants(conversationId, userId);

            // Emit WebSocket event to other participants (for read receipts)
            const io = req.app.get('io');
            otherParticipants.forEach(participantId => {
                io.to(`user_${participantId}`).emit('messages_read', {
                    conversationId,
                    userId,
                    readAt: new Date().toISOString()
                });
            });

            // Respond with success
            res.status(200).json({ 
                success: true,
                message: "Conversation marked as read" 
            });
        } catch (err) {
            // Pass errors to error handling middleware
            next(err);
        }
    },

    /**
     * GET /api/chat/unread-count
     * Get total unread message count across all conversations
     * Returns: { unreadCount: number }
     */
    getTotalUnreadCount: async (req, res, next) => {
        try {
            const userId = req.user.id;

            // Get unread count from database
            const unreadCount = await chatModel.getTotalUnreadCount(userId);

            // Respond with count
            res.status(200).json({ unreadCount });
        } catch (err) {
            // Pass errors to error handling middleware
            next(err);
        }
    },
};

// Export the controller
export default chatController;
