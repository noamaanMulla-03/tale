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
     * 
     * UPDATED: Now supports both direct messages (1-on-1) and group chats
     * - For direct messages: Shows other user's name and avatar
     * - For groups: Shows group name, avatar, and participant count
     */
    getUserConversations: async (userId) => {
        const queryText = `
            SELECT 
                c.id AS conversation_id,
                c.created_at,
                c.updated_at,
                -- Conversation type and group data
                c.conversation_type,
                c.name AS group_name,
                c.avatar_url AS group_avatar,
                c.description AS group_description,
                c.created_by AS group_creator_id,
                -- For direct messages: Other user's info
                -- For groups: This will be NULL (we'll use group name instead)
                u.id AS other_user_id,
                u.username AS other_username,
                u.display_name AS other_display_name,
                u.avatar_url AS other_avatar_url,
                -- Participant count (useful for groups)
                (
                    SELECT COUNT(*)
                    FROM conversation_participants
                    WHERE conversation_id = c.id
                ) AS participant_count,
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
            -- LEFT JOIN with other participant (only for direct messages)
            -- For groups, this will be NULL as there are multiple participants
            LEFT JOIN conversation_participants cp2 
                ON c.id = cp2.conversation_id 
                AND cp2.user_id != $1 
                AND c.conversation_type = 'direct'
            -- Get other user's details (only for direct messages)
            LEFT JOIN users u ON cp2.user_id = u.id
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
     * Get or create a conversation between two users (DIRECT MESSAGE)
     * Returns: Conversation ID (existing or newly created)
     * Used for: Starting a new chat or retrieving existing one
     * 
     * NOTE: This method is specifically for direct messages (1-on-1)
     * For group chats, use createGroupConversation() method
     */
    getOrCreateConversation: async (userId1, userId2) => {
        try {
            // First, try to find existing direct conversation between these two users
            const findQueryText = `
                SELECT cp1.conversation_id
                FROM conversation_participants cp1
                JOIN conversation_participants cp2 
                    ON cp1.conversation_id = cp2.conversation_id
                JOIN conversations c ON cp1.conversation_id = c.id
                WHERE cp1.user_id = $1 
                AND cp2.user_id = $2
                AND c.conversation_type = 'direct'
                LIMIT 1
            `;
            const findQueryParams = [userId1, userId2];
            const findRes = await query(findQueryText, findQueryParams);

            // If conversation exists, return its ID
            if (findRes.rows.length > 0) {
                console.log(`[+] Found existing direct conversation`);
                return findRes.rows[0].conversation_id;
            }

            // If not found, create new direct conversation
            // Use transaction to ensure all inserts succeed or fail together
            await query('BEGIN');

            // Create conversation with type 'direct' and creator
            const createConvQueryText = `
                INSERT INTO conversations (conversation_type, created_by) 
                VALUES ('direct', $1)
                RETURNING id
            `;
            const convRes = await query(createConvQueryText, [userId1]);
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
            console.log(`[+] Created new direct conversation: ${conversationId}`);

            return conversationId;
        } catch (err) {
            // Rollback on error
            await query('ROLLBACK');
            console.error(`[-] Error getting/creating conversation: ${err.message}`);
            throw err;
        }
    },

    /**
     * CREATE A NEW GROUP CONVERSATION
     * Creates a group chat with a name, optional description, and initial participants
     * 
     * @param {number} creatorId - User ID of the group creator
     * @param {string} groupName - Name of the group (required)
     * @param {Array<number>} participantIds - Array of user IDs to add (including creator)
     * @param {string} description - Optional group description
     * @param {string} avatarUrl - Optional group avatar URL
     * @returns {number} - Created conversation ID
     * 
     * Used for: Creating new group chats from UI
     */
    createGroupConversation: async (creatorId, groupName, participantIds, description = null, avatarUrl = null) => {
        try {
            // Validate inputs
            if (!groupName || groupName.trim().length === 0) {
                throw new Error('Group name is required');
            }
            if (!participantIds || participantIds.length < 2) {
                throw new Error('At least 2 participants required for a group');
            }

            // Start transaction
            await query('BEGIN');

            // Create group conversation
            const createGroupQueryText = `
                INSERT INTO conversations (
                    conversation_type, 
                    name, 
                    description, 
                    avatar_url, 
                    created_by
                ) 
                VALUES ('group', $1, $2, $3, $4)
                RETURNING id
            `;
            const createGroupParams = [groupName, description, avatarUrl, creatorId];
            const groupRes = await query(createGroupQueryText, createGroupParams);
            const conversationId = groupRes.rows[0].id;

            // Add all participants (including creator)
            // Build VALUES clause dynamically: ($1, $2), ($1, $3), ($1, $4), ...
            const participantValues = participantIds.map((_, index) => 
                `($1, $${index + 2})`
            ).join(', ');
            
            const addParticipantsQueryText = `
                INSERT INTO conversation_participants (conversation_id, user_id)
                VALUES ${participantValues}
            `;
            const addParticipantsParams = [conversationId, ...participantIds];
            await query(addParticipantsQueryText, addParticipantsParams);

            // Commit transaction
            await query('COMMIT');
            console.log(`[+] Created new group conversation: ${conversationId} with ${participantIds.length} participants`);

            return conversationId;
        } catch (err) {
            // Rollback on error
            await query('ROLLBACK');
            console.error(`[-] Error creating group conversation: ${err.message}`);
            throw err;
        }
    },

    /**
     * ADD PARTICIPANTS TO A GROUP
     * Adds new members to an existing group conversation
     * 
     * @param {number} conversationId - Group conversation ID
     * @param {Array<number>} userIds - Array of user IDs to add
     * @returns {boolean} - Success status
     * 
     * Used for: Adding members to groups
     * NOTE: Should validate that conversation is a group and user has permission
     */
    addGroupParticipants: async (conversationId, userIds) => {
        try {
            // Build VALUES clause dynamically
            const participantValues = userIds.map((_, index) => 
                `($1, $${index + 2})`
            ).join(', ');
            
            const queryText = `
                INSERT INTO conversation_participants (conversation_id, user_id)
                VALUES ${participantValues}
                ON CONFLICT (conversation_id, user_id) DO NOTHING
            `;
            const queryParams = [conversationId, ...userIds];
            
            await query(queryText, queryParams);
            console.log(`[+] Added ${userIds.length} participants to conversation ${conversationId}`);
            return true;
        } catch (err) {
            console.error(`[-] Error adding group participants: ${err.message}`);
            throw err;
        }
    },

    /**
     * REMOVE PARTICIPANT FROM GROUP
     * Removes a member from a group conversation
     * 
     * @param {number} conversationId - Group conversation ID
     * @param {number} userId - User ID to remove
     * @returns {boolean} - Success status
     * 
     * Used for: Removing members or leaving groups
     */
    removeGroupParticipant: async (conversationId, userId) => {
        try {
            const queryText = `
                DELETE FROM conversation_participants
                WHERE conversation_id = $1 AND user_id = $2
            `;
            const queryParams = [conversationId, userId];
            
            const res = await query(queryText, queryParams);
            console.log(`[+] Removed user ${userId} from conversation ${conversationId}`);
            return res.rowCount > 0;
        } catch (err) {
            console.error(`[-] Error removing group participant: ${err.message}`);
            throw err;
        }
    },

    /**
     * UPDATE GROUP DETAILS
     * Updates group name, description, or avatar
     * 
     * @param {number} conversationId - Group conversation ID
     * @param {object} updates - Object with name, description, and/or avatarUrl
     * @returns {boolean} - Success status
     * 
     * Used for: Editing group information
     */
    updateGroupDetails: async (conversationId, updates) => {
        try {
            // Build SET clause dynamically based on provided updates
            const setClauses = [];
            const queryParams = [conversationId];
            let paramIndex = 2;

            if (updates.name !== undefined) {
                setClauses.push(`name = $${paramIndex}`);
                queryParams.push(updates.name);
                paramIndex++;
            }
            if (updates.description !== undefined) {
                setClauses.push(`description = $${paramIndex}`);
                queryParams.push(updates.description);
                paramIndex++;
            }
            if (updates.avatarUrl !== undefined) {
                setClauses.push(`avatar_url = $${paramIndex}`);
                queryParams.push(updates.avatarUrl);
                paramIndex++;
            }

            // If no updates provided, return false
            if (setClauses.length === 0) {
                return false;
            }

            const queryText = `
                UPDATE conversations
                SET ${setClauses.join(', ')}
                WHERE id = $1 AND conversation_type = 'group'
            `;
            
            const res = await query(queryText, queryParams);
            console.log(`[+] Updated group ${conversationId} details`);
            return res.rowCount > 0;
        } catch (err) {
            console.error(`[-] Error updating group details: ${err.message}`);
            throw err;
        }
    },

    /**
     * GET GROUP PARTICIPANTS
     * Fetches all participants in a group with their details
     * 
     * @param {number} conversationId - Group conversation ID
     * @returns {Array} - Array of participant objects with user info
     * 
     * Used for: Displaying group member list
     */
    getGroupParticipants: async (conversationId) => {
        try {
            const queryText = `
                SELECT 
                    u.id,
                    u.username,
                    u.display_name,
                    u.avatar_url,
                    cp.joined_at,
                    c.created_by = u.id AS is_admin
                FROM conversation_participants cp
                JOIN users u ON cp.user_id = u.id
                JOIN conversations c ON cp.conversation_id = c.id
                WHERE cp.conversation_id = $1
                ORDER BY is_admin DESC, cp.joined_at ASC
            `;
            const queryParams = [conversationId];
            
            const res = await query(queryText, queryParams);
            return res.rows;
        } catch (err) {
            console.error(`[-] Error getting group participants: ${err.message}`);
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
     * Returns: Conversation object with participant array and group info
     * Used for: Loading conversation header info
     * 
     * UPDATED: Now includes group details (name, avatar, description, creator)
     */
    getConversationDetails: async (conversationId) => {
        const queryText = `
            SELECT 
                c.id,
                c.created_at,
                c.updated_at,
                -- Group information (NULL for direct messages)
                c.conversation_type,
                c.name,
                c.avatar_url,
                c.description,
                c.created_by,
                -- Participants array with user details
                json_agg(
                    json_build_object(
                        'user_id', u.id,
                        'username', u.username,
                        'display_name', u.display_name,
                        'avatar_url', u.avatar_url,
                        'joined_at', cp.joined_at,
                        'is_admin', c.created_by = u.id
                    ) ORDER BY cp.joined_at
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
