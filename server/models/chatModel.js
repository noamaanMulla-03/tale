// ============================================================================
// CHAT MODEL - Database operations for chat functionality
// ============================================================================
// This module handles all database interactions for conversations and messages
// Follows the same pattern as userModel.js with query text and params
// ============================================================================

// Import the query function from db.js
import { query } from "../db.js";

// Chat model object
const chatModel = {
    
    // ========================================================================
    // CONVERSATION OPERATIONS
    // ========================================================================
    
    /**
     * Get all conversations for a user with last message preview
     * Returns: Array of conversations with participant info and last message
     * Used for: Loading user's conversation list in sidebar
     */
    getUserConversations: async (userId) => {
        // Complex query that:
        // 1. Gets all conversations where user is a participant
        // 2. Joins with other participant (for direct messages)
        // 3. Gets last message preview
        // 4. Calculates unread count
        const queryText = `
            SELECT 
                c.id AS conversation_id,
                c.created_at,
                c.updated_at,
                -- Other user's info (for direct messages)
                u.id AS other_user_id,
                u.username AS other_username,
                u.display_name AS other_display_name,
                u.avatar_url AS other_avatar_url,
                -- Last message preview
                lm.content AS last_message_content,
                lm.message_type AS last_message_type,
                lm.created_at AS last_message_time,
                lm.sender_id AS last_message_sender_id,
                -- Unread count
                (
                    SELECT COUNT(*)
                    FROM messages m
                    WHERE m.conversation_id = c.id
                    AND m.sender_id != $1
                    AND m.created_at > COALESCE(cp1.last_read_at, '1970-01-01')
                    AND m.deleted_at IS NULL
                ) AS unread_count,
                -- User's participant data
                cp1.last_read_at,
                cp1.is_archived
            FROM conversations c
            -- Join with current user's participation
            JOIN conversation_participants cp1 
                ON c.id = cp1.conversation_id AND cp1.user_id = $1
            -- Join with other participant (assumes direct message)
            JOIN conversation_participants cp2 
                ON c.id = cp2.conversation_id AND cp2.user_id != $1
            -- Get other user's details
            JOIN users u ON cp2.user_id = u.id
            -- Get last message (LATERAL join for correlated subquery)
            LEFT JOIN LATERAL (
                SELECT content, message_type, created_at, sender_id
                FROM messages 
                WHERE conversation_id = c.id AND deleted_at IS NULL
                ORDER BY created_at DESC 
                LIMIT 1
            ) lm ON true
            -- Only show non-archived conversations
            WHERE cp1.is_archived = false
            ORDER BY c.updated_at DESC
        `;
        const queryParams = [userId];

        try {
            const res = await query(queryText, queryParams);
            return res.rows;
        } catch (err) {
            console.error(`[-] Error getting user conversations: ${err.message}`);
            throw err;
        }
    },

    /**
     * Get or create a conversation between two users
     * Returns: Conversation ID (existing or newly created)
     * Used for: Starting a new chat or retrieving existing one
     */
    getOrCreateConversation: async (userId1, userId2) => {
        try {
            // First, try to find existing conversation between these two users
            const findQueryText = `
                SELECT cp1.conversation_id
                FROM conversation_participants cp1
                JOIN conversation_participants cp2 
                    ON cp1.conversation_id = cp2.conversation_id
                WHERE cp1.user_id = $1 AND cp2.user_id = $2
                LIMIT 1
            `;
            const findQueryParams = [userId1, userId2];
            const findRes = await query(findQueryText, findQueryParams);

            // If conversation exists, return its ID
            if (findRes.rows.length > 0) {
                return findRes.rows[0].conversation_id;
            }

            // If not found, create new conversation
            // Use transaction to ensure both inserts succeed or fail together
            await query('BEGIN');

            // Create conversation
            const createConvQueryText = `
                INSERT INTO conversations DEFAULT VALUES 
                RETURNING id
            `;
            const convRes = await query(createConvQueryText);
            const conversationId = convRes.rows[0].id;

            // Add both participants
            const addParticipantsQueryText = `
                INSERT INTO conversation_participants (conversation_id, user_id)
                VALUES ($1, $2), ($1, $3)
            `;
            const addParticipantsParams = [conversationId, userId1, userId2];
            await query(addParticipantsQueryText, addParticipantsParams);

            // Commit transaction
            await query('COMMIT');

            return conversationId;
        } catch (err) {
            // Rollback on error
            await query('ROLLBACK');
            console.error(`[-] Error getting/creating conversation: ${err.message}`);
            throw err;
        }
    },

    /**
     * Check if user is a participant in a conversation
     * Returns: Boolean
     * Used for: Authorization checks before allowing access to conversation
     */
    isUserInConversation: async (userId, conversationId) => {
        const queryText = `
            SELECT 1 FROM conversation_participants 
            WHERE user_id = $1 AND conversation_id = $2
        `;
        const queryParams = [userId, conversationId];

        try {
            const res = await query(queryText, queryParams);
            return res.rows.length > 0;
        } catch (err) {
            console.error(`[-] Error checking user in conversation: ${err.message}`);
            throw err;
        }
    },

    /**
     * Get conversation details with participants
     * Returns: Conversation object with participant array
     * Used for: Loading conversation header info
     */
    getConversationDetails: async (conversationId) => {
        const queryText = `
            SELECT 
                c.id,
                c.created_at,
                c.updated_at,
                json_agg(
                    json_build_object(
                        'user_id', u.id,
                        'username', u.username,
                        'display_name', u.display_name,
                        'avatar_url', u.avatar_url
                    )
                ) AS participants
            FROM conversations c
            JOIN conversation_participants cp ON c.id = cp.conversation_id
            JOIN users u ON cp.user_id = u.id
            WHERE c.id = $1
            GROUP BY c.id
        `;
        const queryParams = [conversationId];

        try {
            const res = await query(queryText, queryParams);
            return res.rows[0];
        } catch (err) {
            console.error(`[-] Error getting conversation details: ${err.message}`);
            throw err;
        }
    },

    // ========================================================================
    // MESSAGE OPERATIONS
    // ========================================================================

    /**
     * Get messages for a conversation with pagination
     * Returns: Array of messages with sender info
     * Used for: Loading conversation history (newest first, then reversed in frontend)
     */
    getConversationMessages: async (conversationId, limit = 50, offset = 0) => {
        const queryText = `
            SELECT 
                m.id,
                m.conversation_id,
                m.sender_id,
                m.content,
                m.message_type,
                m.file_url,
                m.file_name,
                m.file_size,
                m.created_at,
                m.updated_at,
                m.is_edited,
                -- Sender info
                u.username AS sender_username,
                u.display_name AS sender_display_name,
                u.avatar_url AS sender_avatar_url
            FROM messages m
            LEFT JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = $1 
            AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const queryParams = [conversationId, limit, offset];

        try {
            const res = await query(queryText, queryParams);
            return res.rows;
        } catch (err) {
            console.error(`[-] Error getting conversation messages: ${err.message}`);
            throw err;
        }
    },

    /**
     * Create a new message
     * Returns: Created message object with sender info
     * Used for: Sending text/image/file/voice messages
     */
    createMessage: async (conversationId, senderId, content, messageType = 'text', fileUrl = null, fileName = null, fileSize = null) => {
        const queryText = `
            INSERT INTO messages (
                conversation_id, 
                sender_id, 
                content, 
                message_type, 
                file_url, 
                file_name, 
                file_size
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const queryParams = [conversationId, senderId, content, messageType, fileUrl, fileName, fileSize];

        try {
            const res = await query(queryText, queryParams);
            
            // Get message with sender info
            const messageWithSender = await chatModel.getMessageById(res.rows[0].id);
            return messageWithSender;
        } catch (err) {
            console.error(`[-] Error creating message: ${err.message}`);
            throw err;
        }
    },

    /**
     * Get a single message by ID with sender info
     * Returns: Message object
     * Used for: After creating message, to return full data to client
     */
    getMessageById: async (messageId) => {
        const queryText = `
            SELECT 
                m.id,
                m.conversation_id,
                m.sender_id,
                m.content,
                m.message_type,
                m.file_url,
                m.file_name,
                m.file_size,
                m.created_at,
                m.updated_at,
                m.is_edited,
                -- Sender info
                u.username AS sender_username,
                u.display_name AS sender_display_name,
                u.avatar_url AS sender_avatar_url
            FROM messages m
            LEFT JOIN users u ON m.sender_id = u.id
            WHERE m.id = $1 AND m.deleted_at IS NULL
        `;
        const queryParams = [messageId];

        try {
            const res = await query(queryText, queryParams);
            return res.rows[0];
        } catch (err) {
            console.error(`[-] Error getting message by ID: ${err.message}`);
            throw err;
        }
    },

    /**
     * Update message content (edit functionality)
     * Returns: Updated message object
     * Used for: Editing sent messages
     */
    updateMessage: async (messageId, newContent) => {
        const queryText = `
            UPDATE messages 
            SET content = $1, 
                is_edited = true, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND deleted_at IS NULL
            RETURNING *
        `;
        const queryParams = [newContent, messageId];

        try {
            const res = await query(queryText, queryParams);
            
            // Get message with sender info
            if (res.rows.length > 0) {
                return await chatModel.getMessageById(messageId);
            }
            return null;
        } catch (err) {
            console.error(`[-] Error updating message: ${err.message}`);
            throw err;
        }
    },

    /**
     * Soft delete a message
     * Returns: Boolean success
     * Used for: Deleting messages (they remain in DB for history)
     */
    deleteMessage: async (messageId) => {
        const queryText = `
            UPDATE messages 
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
        `;
        const queryParams = [messageId];

        try {
            const res = await query(queryText, queryParams);
            return res.rowCount > 0;
        } catch (err) {
            console.error(`[-] Error deleting message: ${err.message}`);
            throw err;
        }
    },

    // ========================================================================
    // READ RECEIPT OPERATIONS
    // ========================================================================

    /**
     * Update last read timestamp for user in conversation
     * Returns: Boolean success
     * Used for: Marking messages as read when user views conversation
     */
    updateLastRead: async (userId, conversationId) => {
        const queryText = `
            UPDATE conversation_participants 
            SET last_read_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND conversation_id = $2
        `;
        const queryParams = [userId, conversationId];

        try {
            const res = await query(queryText, queryParams);
            return res.rowCount > 0;
        } catch (err) {
            console.error(`[-] Error updating last read: ${err.message}`);
            throw err;
        }
    },

    /**
     * Get unread message count for a user across all conversations
     * Returns: Total unread count
     * Used for: Showing global unread badge in app
     */
    getTotalUnreadCount: async (userId) => {
        const queryText = `
            SELECT COUNT(*) AS total_unread
            FROM messages m
            JOIN conversation_participants cp 
                ON m.conversation_id = cp.conversation_id
            WHERE cp.user_id = $1
            AND m.sender_id != $1
            AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')
            AND m.deleted_at IS NULL
        `;
        const queryParams = [userId];

        try {
            const res = await query(queryText, queryParams);
            return parseInt(res.rows[0].total_unread);
        } catch (err) {
            console.error(`[-] Error getting total unread count: ${err.message}`);
            throw err;
        }
    },

    // ========================================================================
    // UTILITY OPERATIONS
    // ========================================================================

    /**
     * Get other participants in a conversation (excluding current user)
     * Returns: Array of user IDs
     * Used for: WebSocket - knowing who to notify when message is sent
     */
    getOtherParticipants: async (conversationId, currentUserId) => {
        const queryText = `
            SELECT user_id 
            FROM conversation_participants 
            WHERE conversation_id = $1 AND user_id != $2
        `;
        const queryParams = [conversationId, currentUserId];

        try {
            const res = await query(queryText, queryParams);
            return res.rows.map(row => row.user_id);
        } catch (err) {
            console.error(`[-] Error getting other participants: ${err.message}`);
            throw err;
        }
    },

    /**
     * Check if message belongs to user
     * Returns: Boolean
     * Used for: Authorization - only message sender can edit/delete
     */
    isMessageOwnedByUser: async (messageId, userId) => {
        const queryText = `
            SELECT 1 FROM messages 
            WHERE id = $1 AND sender_id = $2 AND deleted_at IS NULL
        `;
        const queryParams = [messageId, userId];

        try {
            const res = await query(queryText, queryParams);
            return res.rows.length > 0;
        } catch (err) {
            console.error(`[-] Error checking message ownership: ${err.message}`);
            throw err;
        }
    },
};

// Export the model
export default chatModel;
