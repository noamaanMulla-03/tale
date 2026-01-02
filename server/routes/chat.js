// ============================================================================
// CHAT ROUTES - API endpoints for chat functionality
// ============================================================================
// All routes are protected by authenticateToken middleware
// Follows the same pattern as auth.js
// ============================================================================

// Import express
import express from 'express';

// Import chat controller
import chatController from '../controllers/chatController.js';

// Import middleware
import { authenticateToken } from '../middleware/auth.js';
import { attachmentUpload, imageUpload } from '../middleware/uploadExtended.js';

// Initialize router
const router = express.Router();

// Apply authentication middleware to all routes in this router
// This ensures all chat endpoints require a valid JWT token
router.use(authenticateToken);

// ========================================================================
// CONVERSATION ROUTES
// ========================================================================

/**
 * GET /api/chat/conversations
 * Get all conversations for the authenticated user
 * Returns: Array of conversations with last message and unread count
 */
router.get('/conversations', chatController.getUserConversations);

/**
 * POST /api/chat/conversations
 * Create new conversation or get existing one with another user
 * Body: { otherUserId: number }
 * Returns: Conversation object with participants
 */
router.post('/conversations', chatController.createOrGetConversation);

/**
 * GET /api/chat/conversations/:conversationId
 * Get details for a specific conversation
 * Returns: Conversation object with participants array
 */
router.get('/conversations/:conversationId', chatController.getConversationDetails);

// ========================================================================
// MESSAGE ROUTES
// ========================================================================

/**
 * GET /api/chat/conversations/:conversationId/messages
 * Get messages for a conversation with pagination
 * Query params: limit (default 50), offset (default 0)
 * Returns: Array of messages with sender info
 */
router.get('/conversations/:conversationId/messages', chatController.getConversationMessages);

/**
 * POST /api/chat/conversations/:conversationId/messages
 * Send a new message in a conversation
 * Body: { content: string, messageType?: string, fileUrl?: string, fileName?: string, fileSize?: number }
 * Returns: Created message object
 */
router.post('/conversations/:conversationId/messages', chatController.sendMessage);

/**
 * POST /api/chat/upload/attachment
 * Upload a file attachment (document, video, audio, etc.)
 * Body: FormData with 'file' field
 * Returns: { fileUrl, fileName, fileSize, fileType }
 */
router.post('/upload/attachment', attachmentUpload.single('file'), chatController.uploadAttachment);

/**
 * POST /api/chat/upload/image
 * Upload an image file
 * Body: FormData with 'file' field
 * Returns: { fileUrl, fileName, fileSize, fileType }
 */
router.post('/upload/image', imageUpload.single('file'), chatController.uploadImage);

/**
 * PATCH /api/chat/messages/:messageId
 * Edit an existing message (only by sender)
 * Body: { content: string }
 * Returns: Updated message object
 */
router.patch('/messages/:messageId', chatController.editMessage);

/**
 * DELETE /api/chat/messages/:messageId
 * Delete a message (soft delete, only by sender)
 * Returns: Success status
 */
router.delete('/messages/:messageId', chatController.deleteMessage);

// ========================================================================
// READ RECEIPT ROUTES
// ========================================================================

/**
 * POST /api/chat/conversations/:conversationId/read
 * Mark all messages in conversation as read
 * Returns: Success status
 */
router.post('/conversations/:conversationId/read', chatController.markConversationAsRead);

/**
 * GET /api/chat/unread-count
 * Get total unread message count across all conversations
 * Returns: { unreadCount: number }
 */
router.get('/unread-count', chatController.getTotalUnreadCount);

// ========================================================================
// GROUP CHAT ROUTES
// ========================================================================

/**
 * POST /api/chat/groups
 * Create a new group conversation
 * Body: { name: string, description?: string, participantIds: number[], avatarUrl?: string }
 * Returns: Created group conversation object
 */
router.post('/groups', chatController.createGroup);

/**
 * PATCH /api/chat/groups/:conversationId
 * Update group details (name, description, avatar)
 * Body: { name?: string, description?: string, avatarUrl?: string }
 * Returns: Updated conversation object
 */
router.patch('/groups/:conversationId', chatController.updateGroupDetails);

/**
 * GET /api/chat/groups/:conversationId/participants
 * Get all participants in a group
 * Returns: Array of participant objects
 */
router.get('/groups/:conversationId/participants', chatController.getGroupMembers);

/**
 * POST /api/chat/groups/:conversationId/participants
 * Add participants to a group
 * Body: { userIds: number[] }
 * Returns: Updated conversation object
 */
router.post('/groups/:conversationId/participants', chatController.addGroupMembers);

/**
 * DELETE /api/chat/groups/:conversationId/participants/:participantId
 * Remove a participant from a group (or leave group)
 * Returns: Success status
 */
router.delete('/groups/:conversationId/participants/:participantId', chatController.removeGroupMember);

// Export router
export default router;
