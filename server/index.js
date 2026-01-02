// filename: server/index.js
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

// import dotenv to manage environment variables
// Load from root .env file (one level up from server directory)
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

// import db connection
import { pool } from './db.js';

// Import Redis service for presence and real-time features
import redisService from './services/redisService.js';

// import auth routes
import authRoutes from './routes/auth.js';
// import chat routes
import chatRoutes from './routes/chat.js';

// initialize the server
const app = express();
// Create HTTP server (needed for Socket.IO)
const httpServer = createServer(app);
// Initialize Socket.IO with CORS configuration
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*', // Set specific origin in production
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Make io accessible in route controllers via req.app
app.set('io', io);

// server port from environment variables
const PORT = process.env.PORT || 3000;

// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// CORS for frontend - must be before routes
app.use((req, res, next) => {
    const allowedOrigin = process.env.CORS_ORIGIN || '*';
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// create an express server
app.get('/', (_, res) => {
    res.send('<h1>Hello, Express.js Server!</h1>');
});

// auth routes
app.use('/auth', authRoutes);
// chat routes
app.use('/api/chat', chatRoutes);

// error handling middlewares
app.use((err, req, res, next) => {
    // Handle multer file upload errors
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File size too large! Maximum 5MB allowed.' });
        }
        return res.status(400).json({ error: `File upload error: ${err.message}` });
    }
    
    // Handle custom multer errors (from fileFilter)
    if (err.message === 'Only image files are allowed!') {
        return res.status(400).json({ error: err.message });
    }
    
    console.error(`[-] Error: ${err.stack}`);
    res.status(500).json({ error: 'Something went wrong!' });
});

// test database connection at startup
pool.query('SELECT NOW()')
    .catch(err => console.error(`[-] Database connection failed: ${err.message}`));

// ============================================================================
// SOCKET.IO WEBSOCKET SETUP
// ============================================================================
// Handle real-time events for chat functionality
// Events: connection, disconnect, typing, stop_typing, join_conversation
// 
// OPTIMIZED VERSION: Now uses Redis for presence and state management
// Benefits:
// - User presence persists across server restarts
// - Typing indicators auto-expire (no cleanup needed)
// - Scalable to multiple server instances (via Redis Pub/Sub)
// ============================================================================

// Store user socket connections for quick lookup
// Format: { userId: socketId }
// NOTE: This is in-memory per server instance
// For multi-server setup, use Redis for socket mapping
const userSockets = new Map();

// Online users are now tracked in Redis (not in-memory Set)
// This allows presence to persist and scale across multiple servers
// Legacy in-memory set kept for backward compatibility and quick lookups
const onlineUsers = new Set();

// Socket.IO connection handler
io.on('connection', (socket) => {
    console.log(`[+] Socket connected: ${socket.id}`);

    // ========================================================================
    // USER AUTHENTICATION & ROOM JOINING
    // ========================================================================
    
    /**
     * Event: 'authenticate'
     * Client sends userId to register their socket connection
     * Join user-specific room for receiving targeted messages
     * 
     * OPTIMIZED: Now uses Redis for presence tracking
     */
    socket.on('authenticate', async (userId) => {
        if (!userId) {
            console.error('[-] Authentication failed: No userId provided');
            return;
        }

        // Store user's socket ID for lookup (in-memory for this server)
        userSockets.set(userId, socket.id);
        
        // Add user to local online users set (backward compatibility)
        onlineUsers.add(userId);
        
        // ================================================================
        // REDIS PRESENCE TRACKING (NEW!)
        // ================================================================
        // Set user as online in Redis with 5-minute TTL
        // Client should send heartbeat every 30 seconds to maintain status
        // Auto-expires if client disconnects without cleanup
        await redisService.setUserOnline(userId);
        
        // Join user-specific room (format: user_123)
        // Used to send messages to specific users
        socket.join(`user_${userId}`);
        
        // Store userId in socket data for later use
        socket.userId = userId;
        
        console.log(`[+] User ${userId} authenticated and joined room: user_${userId}`);

        // ================================================================
        // SEND ONLINE USERS LIST
        // ================================================================
        // Get online users from Redis (source of truth)
        // This works across multiple server instances
        const onlineUserIds = await redisService.getOnlineUsers();
        
        // Send to newly connected client
        socket.emit('online_users_list', {
            userIds: onlineUserIds
        });

        // Broadcast to ALL other clients that this user is now online
        socket.broadcast.emit('user_online', {
            userId: userId
        });
    });

    /**
     * Event: 'join_conversation'
     * Client joins a conversation room to receive real-time updates
     * Room format: conversation_123
     */
    socket.on('join_conversation', (conversationId) => {
        if (!conversationId) {
            console.error('[-] Join conversation failed: No conversationId provided');
            return;
        }

        // Join conversation-specific room
        socket.join(`conversation_${conversationId}`);
        console.log(`[+] User ${socket.userId} joined conversation: ${conversationId}`);
    });

    /**
     * Event: 'leave_conversation'
     * Client leaves a conversation room when navigating away
     */
    socket.on('leave_conversation', (conversationId) => {
        if (!conversationId) {
            return;
        }

        socket.leave(`conversation_${conversationId}`);
        console.log(`[+] User ${socket.userId} left conversation: ${conversationId}`);
    });

    // ========================================================================
    // TYPING INDICATORS (OPTIMIZED WITH REDIS)
    // ========================================================================
    
    /**
     * Event: 'typing'
     * Client notifies others in conversation that user is typing
     * 
     * OPTIMIZED: Now uses Redis with auto-expiration
     * - Stores typing state in Redis with 10-second TTL
     * - No need for manual cleanup if client disconnects
     * - Supports multi-server deployments
     */
    socket.on('typing', async ({ conversationId, username }) => {
        if (!conversationId || !socket.userId) {
            return;
        }

        // Store typing state in Redis with 10-second auto-expiration
        // Client should send this event every 3-5 seconds while actively typing
        await redisService.setTyping(conversationId, socket.userId, username);

        // Broadcast to conversation room except sender
        // All clients in the conversation will see the typing indicator
        socket.to(`conversation_${conversationId}`).emit('user_typing', {
            conversationId,
            username,
            userId: socket.userId
        });
    });

    /**
     * Event: 'stop_typing'
     * Client notifies others that user stopped typing
     * 
     * OPTIMIZED: Immediately removes from Redis
     */
    socket.on('stop_typing', async ({ conversationId }) => {
        if (!conversationId || !socket.userId) {
            return;
        }

        // Remove typing state from Redis immediately
        // Don't wait for auto-expiration
        await redisService.stopTyping(conversationId, socket.userId);

        // Broadcast to conversation room except sender
        socket.to(`conversation_${conversationId}`).emit('user_stop_typing', {
            conversationId,
            userId: socket.userId
        });
    });

    // ========================================================================
    // ONLINE STATUS
    // ========================================================================
    
    /**
     * Event: 'online'
     * Client announces they are online
     * This is now handled automatically during authentication
     * Keeping this for backward compatibility but it's redundant
     */
    socket.on('online', () => {
        if (!socket.userId) {
            return;
        }

        // Add to online users set (in case not added during auth)
        onlineUsers.add(socket.userId);

        // Broadcast online status to all OTHER clients (not sender)
        // Sender already knows they're online
        socket.broadcast.emit('user_online', {
            userId: socket.userId
        });
    });

    // ========================================================================
    // WEBRTC VIDEO CALLING
    // ========================================================================
    
    /**
     * Event: 'webrtc-signal'
     * Relay WebRTC signaling messages (offer, answer, ICE candidates) between peers
     * Signaling is required to establish peer-to-peer connection
     * Message types:
     *   - offer: Initial call offer with SDP (Session Description Protocol)
     *   - answer: Response to offer with answerer's SDP
     *   - ice-candidate: ICE (Interactive Connectivity Establishment) candidates for NAT traversal
     */
    socket.on('webrtc-signal', (message) => {
        console.log(`[WebRTC] Relaying ${message.type} from user ${socket.userId} to user ${message.to}`);

        // Add sender's userId to message
        const signalMessage = {
            ...message,
            from: socket.userId
        };

        // Send signaling message to target user's room
        // Target user will receive this via their socket listener
        io.to(`user_${message.to}`).emit('webrtc-signal', signalMessage);
    });

    /**
     * Event: 'webrtc-call-end'
     * Notify remote peer that call has ended
     * Triggered when either peer hangs up
     */
    socket.on('webrtc-call-end', (data) => {
        console.log(`[WebRTC] Call ended by user ${socket.userId}`);

        // Notify the other participant
        io.to(`user_${data.to}`).emit('webrtc-call-end', {
            from: socket.userId,
            conversationId: data.conversationId
        });
    });

    /**
     * Event: 'webrtc-call-rejected'
     * Notify caller that their call was rejected
     */
    socket.on('webrtc-call-rejected', (data) => {
        console.log(`[WebRTC] Call rejected by user ${socket.userId}`);

        // Notify the caller
        io.to(`user_${data.to}`).emit('webrtc-call-rejected', {
            from: socket.userId,
            conversationId: data.conversationId
        });
    });

    // ========================================================================
    // DISCONNECTION (OPTIMIZED WITH REDIS)
    // ========================================================================
    
    /**
     * Event: 'disconnect'
     * Automatically fired when socket connection is lost
     * Clean up user data and broadcast offline status
     * 
     * OPTIMIZED: Now uses Redis for presence cleanup
     * - Sets user offline in Redis across all servers
     * - Removes from online users set
     * - Typing indicators auto-expire via TTL (no manual cleanup needed)
     */
    socket.on('disconnect', async () => {
        console.log(`[-] Socket disconnected: ${socket.id}`);

        if (socket.userId) {
            // ================================================================
            // REDIS PRESENCE CLEANUP
            // ================================================================
            // Set user as offline in Redis (persists across server restarts)
            // This updates the global presence state
            await redisService.setUserOffline(socket.userId);
            
            // Remove from local in-memory maps (this server instance only)
            userSockets.delete(socket.userId);
            onlineUsers.delete(socket.userId);

            // Broadcast offline status to all OTHER clients
            // Connected clients will update their UI to show user as offline
            socket.broadcast.emit('user_offline', {
                userId: socket.userId
            });

            console.log(`[-] User ${socket.userId} went offline`);
        }
    });
});

// start the server (use httpServer instead of app for Socket.IO)
httpServer.listen(PORT, () => {
    console.log(`[+] Server running on Port: ${PORT}`)
});