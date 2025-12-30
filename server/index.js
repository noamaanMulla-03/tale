// filename: server/index.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

// import dotenv to manage environment variables
import dotenv from 'dotenv';
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// import db connection
import { pool } from './db.js';

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
        origin: '*', // In production, specify your frontend URL
        methods: ['GET', 'POST']
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CORS for frontend - must be before routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
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
// ============================================================================

// Store user socket connections for quick lookup
// Format: { userId: socketId }
const userSockets = new Map();

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
     */
    socket.on('authenticate', (userId) => {
        if (!userId) {
            console.error('[-] Authentication failed: No userId provided');
            return;
        }

        // Store user's socket ID for lookup
        userSockets.set(userId, socket.id);
        
        // Join user-specific room (format: user_123)
        // Used to send messages to specific users
        socket.join(`user_${userId}`);
        
        // Store userId in socket data for later use
        socket.userId = userId;
        
        console.log(`[+] User ${userId} authenticated and joined room: user_${userId}`);
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
    // TYPING INDICATORS
    // ========================================================================
    
    /**
     * Event: 'typing'
     * Client notifies others in conversation that user is typing
     * Broadcast to all other users in the conversation
     */
    socket.on('typing', ({ conversationId, username }) => {
        if (!conversationId) {
            return;
        }

        // Broadcast to conversation room except sender
        socket.to(`conversation_${conversationId}`).emit('user_typing', {
            conversationId,
            username,
            userId: socket.userId
        });
    });

    /**
     * Event: 'stop_typing'
     * Client notifies others that user stopped typing
     */
    socket.on('stop_typing', ({ conversationId }) => {
        if (!conversationId) {
            return;
        }

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
     * Broadcast to all connected clients (can be optimized to send only to contacts)
     */
    socket.on('online', () => {
        if (!socket.userId) {
            return;
        }

        // Broadcast online status to all clients
        io.emit('user_online', {
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
    // DISCONNECTION
    // ========================================================================
    
    /**
     * Event: 'disconnect'
     * Automatically fired when socket connection is lost
     * Clean up user data and broadcast offline status
     */
    socket.on('disconnect', () => {
        console.log(`[-] Socket disconnected: ${socket.id}`);

        if (socket.userId) {
            // Remove from user sockets map
            userSockets.delete(socket.userId);

            // Broadcast offline status to all clients
            io.emit('user_offline', {
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