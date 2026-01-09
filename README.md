# Tale

A modern desktop chat application built with Tauri, React, TypeScript, and PostgreSQL. Tale provides a meaningful way to follow and manage your conversations with a beautiful, dark-themed interface.

## Features

- **Desktop Application** - Cross-platform desktop app powered by Tauri with system tray integration
- **Secure Authentication** - User registration, login, and email verification via OTP
- **Real-time Messaging** - Instant message delivery with Socket.IO and WebSocket
- **Group Chats** - Create and manage group conversations with multiple participants
- **Video Calls** - Peer-to-peer video calling using WebRTC with offer/answer signaling
- **File Sharing** - Upload and share images and attachments within conversations
- **Profile Management** - Customizable user profiles with avatars, bio, and personal details
- **Typing Indicators** - Real-time typing status with Redis-backed auto-expiration
- **Online Presence** - Live user online/offline status across all connected clients
- **Read Receipts** - Track message read status and unread counts per conversation
- **Message Management** - Edit and delete sent messages with real-time updates
- **User Search** - Find and connect with users by username or display name
- **Rate Limiting** - Redis-backed protection against spam and abuse
- **State Management** - Zustand for global state with secure localStorage persistence
- **Modern UI** - Dark theme with shadcn/ui components and Tailwind CSS v4
- **Protected Routes** - Client-side route guards for authenticated pages
- **Type-Safe** - Full TypeScript support across frontend and backend

## Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Desktop Framework**: Tauri 2
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **State Management**: Zustand with persist middleware
- **Routing**: React Router DOM v7
- **HTTP Client**: Axios
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js v5
- **Database**: PostgreSQL with optimized connection pooling
- **Cache & Presence**: Redis (ioredis) for rate limiting, typing indicators, and online status
- **Email Service**: Resend for OTP verification
- **Authentication**: bcryptjs, JWT (JSON Web Tokens)
- **Real-time**: Socket.io for instant messaging, typing indicators, and presence
- **WebRTC**: Peer-to-peer video calling with ICE/STUN servers
- **File Upload**: Multer for image and attachment handling

## Prerequisites

- **Node.js** (v18 or higher)
- **Rust** (latest stable) - Required for Tauri
- **PostgreSQL** (v14 or higher)
- **Redis** (v6 or higher) - Local instance or cloud URL (e.g., Upstash, Railway)
- **npm** or **yarn**

## Installation

### 1. Clone the repository

```bash
git clone [https://github.com/noamaanMulla-03/tale.git](https://github.com/noamaanMulla-03/tale.git)
cd tale
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd server
npm install
cd ..
```

### 4. Set up PostgreSQL database

Create the required database and tables:

```bash
# Create a new database
createdb tale

# Connect to the database
psql -d tale
```

Then run the following SQL to create all required tables:

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User profiles table (additional profile information)
CREATE TABLE profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    gender VARCHAR(20),
    dob DATE,
    phone_number VARCHAR(20),
    bio TEXT,
    profile_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table (both direct messages and group chats)
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    conversation_type VARCHAR(20) NOT NULL DEFAULT 'direct', -- 'direct' or 'group'
    name VARCHAR(100), -- NULL for direct messages, group name for groups
    avatar_url TEXT, -- NULL for direct messages, group avatar for groups
    description TEXT, -- Group description (NULL for direct messages)
    created_by INTEGER REFERENCES users(id), -- User who created the group
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation participants (many-to-many relationship)
CREATE TABLE conversation_participants (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_archived BOOLEAN DEFAULT FALSE,
    UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'file'
    attachment_url TEXT, -- URL for images/files
    attachment_name TEXT, -- Original filename
    attachment_size INTEGER, -- File size in bytes
    attachment_mime_type VARCHAR(100), -- MIME type
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_conversations_created_by ON conversations(created_by);
CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

### 5. Set up Redis database

Ensure you have Redis running locally on port 6379

```
redis-server
```

Or obtain a connection string from a cloud provider (e.g., Upstash, Railway).

### 6. Get Resend API key

Sign up at [Resend](https://resend.com) and generate an API Key for sending emails.

### 7. Configure environment variables

Create a `.env` file in the `server` directory:

```bash
cd server
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Express server port
PORT=3000

# PostgreSQL database connection
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
POSTGRES_DB=tale
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Optional: PostgreSQL connection pool settings (use defaults if not specified)
POSTGRES_MAX_POOL=20
POSTGRES_MIN_POOL=5

# JWT secret key for authentication (use a strong random string)
JWT_SECRET=your_jwt_secret_key

# Resend API key for email verification (Get from https://resend.com)
RESEND_API_KEY=re_your_api_key_here

# Redis connection URL for caching and rate limiting
REDIS_URL=redis://localhost:6379

# Optional: CORS origin for frontend (defaults to * if not specified)
CORS_ORIGIN=http://localhost:1420
```

## Running the Application

### Development Mode

You'll need three terminal windows:

**Terminal 1 - PostgreSQL Database:**
```bash
# Ensure PostgreSQL is running
# On macOS with Homebrew:
brew services start postgresql

# On Linux:
sudo systemctl start postgresql
```

**Terminal 2 - Redis Server:**
```bash
# Start Redis server
redis-server

# Or if running as a service:
# macOS: brew services start redis
# Linux: sudo systemctl start redis
```

**Terminal 3 - Backend API Server:**
```bash
cd server
npm run dev
```

The backend will run on `http://localhost:3000` with hot reload enabled.

**Terminal 4 - Tauri Desktop App:**
```bash
npm run tauri dev
```

The Tauri app will launch automatically with the frontend running on `http://localhost:1420`.

### Production Build

```bash
# Build the frontend and Tauri app
npm run tauri build

# The installer will be in src-tauri/target/release/bundle/
# - Windows: .msi or .exe installer
# - macOS: .dmg or .app bundle
# - Linux: .deb, .rpm, or .AppImage
```

### Platform-Specific Builds

```bash
# Build for macOS (Universal binary for Intel + Apple Silicon)
npm run build:macos

# Build for Windows
npm run build:windows
```

## Project Structure

```
tale/
├── src/                          # Frontend React application
│   ├── components/               # Reusable UI components
│   │   └── ui/                   # shadcn/ui components (21 components)
│   ├── features/                 # Feature-based modules
│   │   ├── auth/                 # Authentication feature
│   │   │   ├── components/       # Login, Signup, EmailVerification forms
│   │   │   └── services/         # Auth API calls
│   │   ├── chat/                 # Chat feature
│   │   │   ├── components/       # MessageBubble, MessageInput, ChatHeader
│   │   │   │                     # GroupInfoPanel, VideoCallWindow, etc.
│   │   │   └── services/         # Chat API calls
│   │   ├── profile/              # User profile feature
│   │   │   ├── components/       # ProfilePage, ProfileForm
│   │   │   └── services/         # Profile API calls
│   │   └── contact-list/         # Contact list feature
│   │       └── components/       # ContactItem, ContactList
│   ├── lib/                      # Utility functions and services
│   │   ├── api.ts                # Axios API client with interceptors
│   │   ├── socket.ts             # Socket.IO client connection manager
│   │   ├── webrtc.ts             # WebRTC utilities for video calls
│   │   ├── notifications.ts      # Tauri desktop notifications
│   │   ├── storage.ts            # Secure storage (macOS Keychain)
│   │   ├── avatar.ts             # Avatar utilities
│   │   └── utils.ts              # Helper utilities (cn, toast config)
│   ├── pages/                    # Page components
│   │   ├── AuthPageWrapper.tsx   # Auth wrapper page
│   │   ├── ChatPage.tsx          # Main chat interface
│   │   ├── SettingsPage.tsx      # Settings page
│   │   └── onBoarding/           # Onboarding flow pages
│   ├── router/                   # Routing configuration
│   │   ├── index.ts              # Main router with all routes
│   │   ├── ProtectedRoute.tsx    # Authentication route guard
│   │   └── ProfileCompletionGuard.tsx # Profile completion check
│   ├── store/                    # State management (Zustand)
│   │   ├── useAuthStore.ts       # Auth state with persistence
│   │   └── useChatStore.ts       # Chat state (messages, conversations)
│   ├── types/                    # TypeScript interfaces
│   │   ├── index.ts              # Global type definitions
│   │   └── chat.ts               # Chat-specific types
│   ├── hooks/                    # Custom React hooks
│   ├── config/                   # App configuration
│   │   └── index.ts              # API URL and WebSocket config
│   ├── App.tsx                   # Root component with router
│   └── main.tsx                  # React entry point
├── server/                       # Backend Express server
│   ├── controllers/              # Request handlers (business logic)
│   │   ├── userController.js     # Auth, profile, user search (359 lines)
│   │   ├── chatController.js     # Messages, conversations, groups (832 lines)
│   │   └── OTPTemplate.js        # Email OTP template generator
│   ├── models/                   # Database models (data access layer)
│   │   ├── userModel.js          # User and profile queries (179 lines)
│   │   └── chatModel.js          # Chat, message, group queries (861 lines)
│   ├── routes/                   # API route definitions
│   │   ├── auth.js               # Auth endpoints (login, register, OTP, profile)
│   │   └── chat.js               # Chat endpoints (messages, groups, files)
│   ├── middleware/               # Express middleware
│   │   ├── auth.js               # JWT authentication middleware
│   │   ├── upload.js             # File upload for avatars
│   │   └── uploadExtended.js     # File upload for chat attachments
│   ├── services/                 # External services
│   │   └── redisService.js       # Redis operations (presence, typing)
│   ├── db.js                     # PostgreSQL connection pool (optimized)
│   ├── index.js                  # Server entry point with Socket.IO (393 lines)
│   └── package.json              # Backend dependencies
├── src-tauri/                    # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs               # Tauri entry point
│   │   └── lib.rs                # Tauri commands and system tray setup
│   ├── icons/                    # App icons for all platforms
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
├── public/                       # Static assets
├── components.json               # shadcn/ui configuration
├── tailwind.config.js            # Tailwind CSS v4 configuration
├── vite.config.ts                # Vite build configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Frontend dependencies
```

## API Endpoints

### Authentication

**Register User**
```http
POST /auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Login User**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Send OTP**
```http
POST /auth/send-otp
Content-Type: application/json

{ 
  "email": "john@example.com"
}
```

**Verify OTP**
```http
POST /auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com", 
  "otp": "123456"
}
```

**Setup Profile** (Protected)
```http
POST /auth/profile-setup
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "displayName": "John Doe",
  "gender": "male",
  "dob": "1990-01-01",
  "phoneNumber": "+1234567890",
  "bio": "Software developer",
  "avatar": <file>
}
```

**Get Profile** (Protected)
```http
GET /auth/profile
Authorization: Bearer <token>
```

**Search Users** (Protected)
```http
GET /auth/users/search?q=john
Authorization: Bearer <token>
```

### Chat & Messaging

**Get Conversations** (Protected)
```http
GET /api/chat/conversations
Authorization: Bearer <token>
```

**Create or Get Direct Conversation** (Protected)
```http
POST /api/chat/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "otherUserId": 5
}
```

**Get Conversation Details** (Protected)
```http
GET /api/chat/conversations/:conversationId
Authorization: Bearer <token>
```

**Get Messages** (Protected)
```http
GET /api/chat/conversations/:conversationId/messages?limit=50&offset=0
Authorization: Bearer <token>
```

**Send Message** (Protected)
```http
POST /api/chat/conversations/:conversationId/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hello!",
  "messageType": "text"
}
```

**Edit Message** (Protected)
```http
PATCH /api/chat/messages/:messageId
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Updated message"
}
```

**Delete Message** (Protected)
```http
DELETE /api/chat/messages/:messageId
Authorization: Bearer <token>
```

**Mark Conversation as Read** (Protected)
```http
POST /api/chat/conversations/:conversationId/read
Authorization: Bearer <token>
```

**Get Total Unread Count** (Protected)
```http
GET /api/chat/unread-count
Authorization: Bearer <token>
```

**Upload Image** (Protected)
```http
POST /api/chat/upload/image
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "file": <image-file>
}
```

**Upload Attachment** (Protected)
```http
POST /api/chat/upload/attachment
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "file": <file>
}
```

### Group Chats

**Create Group** (Protected)
```http
POST /api/chat/groups
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Project Team",
  "description": "Team collaboration",
  "participantIds": [2, 3, 4]
}
```

**Update Group Details** (Protected)
```http
PATCH /api/chat/groups/:conversationId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Get Group Members** (Protected)
```http
GET /api/chat/groups/:conversationId/participants
Authorization: Bearer <token>
```

**Add Group Members** (Protected)
```http
POST /api/chat/groups/:conversationId/participants
Authorization: Bearer <token>
Content-Type: application/json

{
  "userIds": [5, 6]
}
```

**Remove Group Member** (Protected)
```http
DELETE /api/chat/groups/:conversationId/participants/:participantId
Authorization: Bearer <token>
```

## Socket.IO Events

### Client → Server Events

**Authenticate Socket**
```javascript
socket.emit('authenticate', userId);
// Registers socket connection with user ID
// Server responds with 'online_users_list'
```

**Join Conversation**
```javascript
socket.emit('join_conversation', conversationId);
// Join a conversation room to receive real-time messages
```

**Leave Conversation**
```javascript
socket.emit('leave_conversation', conversationId);
// Leave a conversation room
```

**Typing Indicator**
```javascript
socket.emit('typing', { conversationId, username });
// Notify others that user is typing (auto-expires after 10s)

socket.emit('stop_typing', { conversationId });
// Notify others that user stopped typing
```

**WebRTC Signaling**
```javascript
socket.emit('webrtc-signal', {
  type: 'offer' | 'answer' | 'ice-candidate',
  to: remoteUserId,
  conversationId,
  data: RTCSessionDescriptionInit | RTCIceCandidateInit
});
// Exchange WebRTC signaling messages for video calls
```

**End Video Call**
```javascript
socket.emit('webrtc-call-end', { to: remoteUserId, conversationId });
// Notify remote peer that call has ended
```

**Reject Video Call**
```javascript
socket.emit('webrtc-call-rejected', { to: callerId, conversationId });
// Notify caller that call was rejected
```

### Server → Client Events

**Online Users List**
```javascript
socket.on('online_users_list', ({ userIds }) => {
  // Initial list of online users after authentication
});
```

**User Online/Offline**
```javascript
socket.on('user_online', ({ userId }) => {
  // User came online
});

socket.on('user_offline', ({ userId }) => {
  // User went offline
});
```

**New Message**
```javascript
socket.on('new_message', (message) => {
  // Real-time message received
  // message: { id, conversationId, senderId, content, messageType, ... }
});
```

**Message Updated**
```javascript
socket.on('message_updated', ({ messageId, content, editedAt }) => {
  // Message was edited
});
```

**Message Deleted**
```javascript
socket.on('message_deleted', ({ messageId, conversationId }) => {
  // Message was deleted
});
```

**Typing Indicators**
```javascript
socket.on('user_typing', ({ conversationId, username, userId }) => {
  // User started typing
});

socket.on('user_stop_typing', ({ conversationId, userId }) => {
  // User stopped typing
});
```

**WebRTC Signaling**
```javascript
socket.on('webrtc-signal', (message) => {
  // Received WebRTC signaling message
  // message: { type, from, to, conversationId, data }
});

socket.on('webrtc-call-end', ({ from, conversationId }) => {
  // Remote peer ended the call
});

socket.on('webrtc-call-rejected', ({ from, conversationId }) => {
  // Remote peer rejected the call
});
```

## UI Components

The project uses [shadcn/ui](https://ui.shadcn.com/) components with custom dark theme:

- `Button` - Interactive buttons with variants (default, outline, ghost, destructive)
- `Card` - Container for content with header, content, and footer sections
- `Input` - Form input fields with focus states
- `InputOTP` - 6-digit verification code input for email OTP
- `Label` - Form labels with proper accessibility
- `Field` - Form field wrapper with validation and error messages
- `Textarea` - Multi-line text input for messages and bio
- `Separator` - Visual dividers (horizontal/vertical)
- `Progress` - Visual timer for OTP expiration countdown
- `Toast (Sonner)` - Notification system for success/error messages
- `Avatar` - User profile pictures with fallback initials
- `Badge` - Status indicators and labels
- `Calendar` - Date picker for date of birth
- `Dialog` - Modal dialogs for confirmations and forms
- `Dropdown Menu` - Context menus and action menus
- `Popover` - Floating content containers
- `Scroll Area` - Custom scrollable areas with styled scrollbars
- `Select` - Dropdown select inputs
- `Switch` - Toggle switches for settings
- `File Upload` - Drag-and-drop file upload component

Add more components:
```bash
npx shadcn@latest add [component-name]
```

## Tauri Desktop Features

### System Tray
- **Persistent Tray Icon**: App runs in system tray even when window is closed
- **Tray Menu**: Quick access menu with "Show" and "Quit" options
- **Click to Show**: Left-click tray icon to restore window
- **Background Running**: App continues to receive messages in background

### Desktop Notifications
- **Native Notifications**: OS-level notifications via Tauri plugin
- **Message Alerts**: Notify when new messages arrive (even when app is minimized)
- **Permission Handling**: Request notification permissions on first launch
- **Customizable**: Support for notification title, body, and icon

### Secure Storage
- **Platform-Specific**: Uses macOS Keychain, Windows Credential Manager, Linux Secret Service
- **Token Storage**: JWT tokens stored securely outside of localStorage
- **Encrypted**: Platform-provided encryption for sensitive data
- **Tauri Store Plugin**: Persistent key-value storage for app state

### Native Features
- **Window Management**: Minimize to tray, restore, focus window
- **Deep Links**: Support for custom URL schemes (tale://)
- **Auto-Launch**: Option to start app on system boot
- **Cross-Platform**: Single codebase for Windows, macOS, and Linux
- **Small Bundle Size**: ~10-15MB installers (compared to 100MB+ for Electron)

## Authentication Flow

1. **Registration**: User submits registration form with username, email, and password
2. **Password Hashing**: Backend hashes password using bcrypt (10 rounds)
3. **Email Verification**: System sends OTP to user's email via Resend
4. **OTP Verification**: User enters 6-digit OTP (expires in 5 minutes)
5. **Email Confirmation**: Backend marks email as verified in database
6. **JWT Generation**: Backend creates JWT token with user data
7. **Token Storage**: Frontend stores token in Zustand store and secure storage
8. **Profile Setup**: User completes profile with avatar, bio, and personal details
9. **Protected Routes**: Router guards check authentication before allowing access
10. **API Authentication**: All protected API requests include JWT in Authorization header
11. **Token Refresh**: Token included in subsequent requests for stateless authentication

## Real-time Chat Features

### Message Delivery
- **Instant Delivery**: Socket.IO WebSocket connection for real-time message delivery
- **Message Types**: Support for text messages, images (PNG, JPG, GIF), and file attachments
- **Read Receipts**: Track when messages are read with last_read_at timestamps
- **Unread Counts**: Real-time unread message counts per conversation
- **Message Editing**: Edit sent messages with edited_at timestamp
- **Message Deletion**: Soft delete with deleted_at (preserves data integrity)

### Typing Indicators
- **Real-time Updates**: See when other users are typing
- **Redis TTL**: Auto-expire after 10 seconds if client disconnects
- **Multi-user Support**: Shows multiple users typing in group chats
- **Optimized**: Redis-backed to work across multiple server instances

### Online Presence
- **Live Status**: Real-time online/offline indicators for all users
- **Redis Presence**: Distributed presence tracking for horizontal scaling
- **Heartbeat**: 30-second heartbeat to maintain online status
- **Auto-cleanup**: Status auto-expires after 5 minutes of inactivity

### Group Chats
- **Create Groups**: Create group conversations with multiple participants
- **Group Management**: Add/remove members, update group name and description
- **Group Avatar**: Upload custom group avatars
- **Member List**: View all participants in a group
- **Group Creator**: Track who created the group
- **Participant Permissions**: Only members can see group messages

## Video Calling (WebRTC)

### Architecture
- **Peer-to-peer**: Direct connection between users (no media server)
- **Signaling**: Socket.IO relays WebRTC signaling messages (offer/answer/ICE)
- **STUN Servers**: Google's public STUN servers for NAT traversal
- **ICE Candidates**: Interactive Connectivity Establishment for optimal connection

### Call Flow
1. **Initiate Call**: Caller clicks video call button in chat
2. **Local Stream**: Capture caller's camera and microphone
3. **Create Offer**: Generate WebRTC offer with SDP
4. **Send Signal**: Relay offer to recipient via Socket.IO
5. **Recipient Answer**: Recipient accepts call and generates answer
6. **Exchange ICE**: Both peers exchange ICE candidates
7. **Establish Connection**: Direct P2P connection established
8. **Media Streaming**: Video and audio streams flow between peers
9. **End Call**: Either peer can end call, notifies remote peer

### Features
- **Video & Audio**: Full-duplex video and audio communication
- **Call Notifications**: Desktop notifications for incoming calls
- **Call Controls**: Mute/unmute audio, enable/disable video, end call
- **Call States**: idle, calling, ringing, connected, ended
- **Error Handling**: Network errors, permission denied, connection failures

## Database Schema

### Users Table

Stores user account information and authentication data.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Profiles Table

Extended user profile information (one-to-one with users).

```sql
CREATE TABLE profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    gender VARCHAR(20),
    dob DATE,
    phone_number VARCHAR(20),
    bio TEXT,
    profile_completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Conversations Table

Stores both direct messages (1-on-1) and group chats.

```sql
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    conversation_type VARCHAR(20) NOT NULL DEFAULT 'direct', -- 'direct' or 'group'
    name VARCHAR(100),        -- NULL for direct messages, group name for groups
    avatar_url TEXT,          -- NULL for direct messages, group avatar for groups
    description TEXT,         -- Group description (NULL for direct messages)
    created_by INTEGER REFERENCES users(id), -- User who created the group
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Conversation Participants Table

Many-to-many relationship between users and conversations.

```sql
CREATE TABLE conversation_participants (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- For read receipts
    is_archived BOOLEAN DEFAULT FALSE,
    UNIQUE(conversation_id, user_id)
);
```

### Messages Table

Stores all chat messages with support for text, images, and file attachments.

```sql
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    content TEXT,                     -- Message text content
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'file'
    attachment_url TEXT,              -- URL for uploaded images/files
    attachment_name TEXT,             -- Original filename
    attachment_size INTEGER,          -- File size in bytes
    attachment_mime_type VARCHAR(100), -- MIME type (e.g., 'image/png')
    edited_at TIMESTAMP,              -- When message was last edited
    deleted_at TIMESTAMP,             -- Soft delete timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

Optimized indexes for fast queries:

```sql
-- Conversation indexes
CREATE INDEX idx_conversations_created_by ON conversations(created_by);

-- Participant indexes (for conversation lookups)
CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);

-- Message indexes (for pagination and unread counts)
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

## Security Features

- **Password Hashing** - bcrypt with 10 salt rounds for secure password storage
- **JWT Authentication** - Stateless token-based authentication with Bearer tokens
- **Protected Routes** - Authentication guards on both client and server sides
- **Email Verification** - OTP-based email verification before account activation
- **CORS Configuration** - Configurable Cross-Origin Resource Sharing for frontend-backend communication
- **Rate Limiting** - Redis-backed rate limiting on OTP requests (max 3 attempts per 15 minutes)
- **OTP Expiration** - OTPs automatically expire after 5 minutes via Redis TTL
- **Secure Storage** - Tauri secure storage plugin (macOS Keychain integration)
- **Environment Variables** - Sensitive configuration managed via dotenv
- **Type-Safe API** - TypeScript interfaces prevent common vulnerabilities
- **SQL Injection Prevention** - Parameterized queries throughout the codebase
- **Soft Deletes** - Messages use soft delete (deleted_at) to preserve data integrity
- **File Upload Validation** - Multer middleware with file type and size restrictions
- **WebSocket Authentication** - Socket.IO connections require user authentication
- **Session Management** - Automatic cleanup of expired sessions and typing indicators

## 🧪 Testing

### Backend Tests
```bash
cd server
npm test
```

**Note**: Test infrastructure is in place but tests need to be written. Contributions welcome!

**Recommended Testing Tools**:
- **Jest** or **Mocha** for unit tests
- **Supertest** for API endpoint testing
- **Mock databases** for isolated tests

### Frontend Tests
```bash
npm test
```

**Recommended Testing Tools**:
- **Vitest** (Vite-native test runner)
- **React Testing Library** for component tests
- **MSW** (Mock Service Worker) for API mocking
- **Playwright** for E2E tests

### Manual Testing Checklist

**Authentication Flow**
- [ ] User registration with valid/invalid data
- [ ] Email OTP sending and verification
- [ ] Login with correct/incorrect credentials
- [ ] JWT token persistence and expiration

**Chat Features**
- [ ] Send text messages in direct chat
- [ ] Send images and file attachments
- [ ] Create group chats with multiple users
- [ ] Add/remove group members
- [ ] Edit and delete messages
- [ ] Read receipts and unread counts

**Real-time Features**
- [ ] Typing indicators appear/disappear correctly
- [ ] Online/offline status updates in real-time
- [ ] Messages arrive instantly without refresh
- [ ] Video call signaling works between peers

**Desktop Features**
- [ ] System tray icon appears
- [ ] Desktop notifications for new messages
- [ ] Window minimize/restore from tray
- [ ] App survives network reconnection

## Troubleshooting

### Common Issues

**PostgreSQL Connection Errors**
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL service
# macOS:
brew services start postgresql

# Linux:
sudo systemctl start postgresql

# Verify credentials in server/.env
```

**Redis Connection Errors**
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Start Redis service
redis-server

# Or as background service:
# macOS:
brew services start redis

# Linux:
sudo systemctl start redis
```

**Tauri Build Errors**
```bash
# Install Rust if not present
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Update Rust to latest stable
rustup update

# Install required dependencies
# macOS:
xcode-select --install

# Linux (Ubuntu/Debian):
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
  build-essential \
  curl \
  wget \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

**WebSocket Connection Issues**
```bash
# Check if backend is running on correct port
curl http://localhost:3000

# Verify CORS_ORIGIN in server/.env matches frontend URL
CORS_ORIGIN=http://localhost:1420

# Check browser console for WebSocket errors
# Open DevTools > Network > WS tab
```

**OTP Email Not Sending**
```bash
# Verify Resend API key in server/.env
RESEND_API_KEY=re_...

# Check server logs for email errors
cd server
npm run dev
# Look for "Email sent successfully" or error messages

# Test Resend API key at https://resend.com/api-keys
```

**Port Already in Use**
```bash
# Find process using port 3000 (backend)
lsof -i :3000
kill -9 <PID>

# Find process using port 1420 (frontend)
lsof -i :1420
kill -9 <PID>

# Or change ports in:
# - server/.env (PORT=3001)
# - vite.config.ts (server.port)
```

**Database Migration Issues**
```bash
# Drop and recreate database (CAUTION: deletes all data)
dropdb tale
createdb tale

# Re-run all CREATE TABLE statements
psql -d tale < schema.sql

# Or connect and run manually:
psql -d tale
\i /path/to/schema.sql
```

**Missing Dependencies**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Same for server
cd server
rm -rf node_modules package-lock.json
npm install
```

**Video Call Not Working**
```bash
# Check browser permissions
# Chrome: chrome://settings/content/camera
# Firefox: about:preferences#privacy

# Verify WebRTC is enabled
# Test at: https://test.webrtc.org/

# Check NAT/Firewall settings (for STUN/TURN)
# Behind strict NAT may need TURN server

# Check browser console for WebRTC errors
```

## Performance & Optimization

### Backend Optimizations

**Database Query Optimization**
- **N+1 Query Fix**: Single query with JSON aggregation instead of multiple queries
  - Before: 101 queries for 100 conversations (~800ms)
  - After: 1 query (~15-20ms) - **50x faster**
- **Connection Pooling**: Optimized PostgreSQL pool (20 max, 5 min connections)
- **Query Timeouts**: 10-second timeout prevents runaway queries
- **Indexes**: Strategic indexes on frequently queried columns
- **LATERAL Joins**: Efficient correlated subqueries for last messages

**Caching & Performance**
- **Redis Caching**: User data and presence cached in Redis
- **Auto-expiration**: TTL on typing indicators (10s) and presence (5min)
- **In-memory Maps**: userSockets for fast socket ID lookups
- **Lazy Loading**: Messages paginated (50 per request)

**Real-time Optimization**
- **Room-based Broadcasting**: Socket.IO rooms prevent unnecessary broadcasts
- **Selective Events**: Only broadcast to conversation participants
- **Heartbeat**: 30-second heartbeat reduces Redis load

### Frontend Optimizations

**State Management**
- **Zustand**: Lightweight state management (minimal re-renders)
- **Selective Updates**: Only update changed conversations/messages
- **Persistence**: localStorage for auth, memory for chat state

**UI Performance**
- **Virtual Scrolling**: Efficiently render long message lists
- **Lazy Image Loading**: Images load as they enter viewport
- **Debounced Typing**: Typing events throttled to 3-5 seconds
- **Optimistic Updates**: Instant UI updates, sync with server later

**Bundle Optimization**
- **Code Splitting**: React Router lazy loading
- **Tree Shaking**: Vite removes unused code
- **CSS Purging**: Tailwind CSS v4 purges unused styles
- **Asset Optimization**: Images compressed and served efficiently

## Development Guidelines

### Code Style

- Use TypeScript for all frontend code with strict type checking
- Follow React hooks best practices (useEffect dependencies, custom hooks)
- Use async/await over raw promises for readability
- Implement proper error handling with try-catch blocks
- Add JSDoc comments for complex logic and functions
- Use descriptive variable names (avoid single letters except in loops)
- Prefer functional programming patterns (map, filter, reduce)
- Keep functions small and focused (single responsibility principle)

### State Management

- Use Zustand for global state (auth, chat)
- Keep component state local when possible (useState, useReducer)
- Persist only essential state to localStorage (auth tokens, user preferences)
- Use type-safe store slices with TypeScript interfaces
- Avoid prop drilling - use Zustand stores for deep component trees
- Clear state on logout to prevent data leaks

### API Integration

- Centralize API calls in service files (`features/*/services/`)
- Use axios interceptors for auth headers and error handling
- Handle errors consistently with toast notifications
- Type all API requests and responses with TypeScript interfaces
- Use proper HTTP methods (GET, POST, PATCH, DELETE)
- Include loading states for async operations
- Implement retry logic for transient network failures

### Database Best Practices

- Always use parameterized queries ($1, $2) to prevent SQL injection
- Create indexes on foreign keys and frequently queried columns
- Use transactions for multi-step operations
- Implement soft deletes (deleted_at) for important data
- Use JOINs efficiently (INNER vs LEFT vs LATERAL)
- Aggregate data in database (json_agg) rather than in application code
- Monitor query performance with EXPLAIN ANALYZE

### Socket.IO Best Practices

- Join specific rooms (user_123, conversation_456) for targeted broadcasts
- Always validate userId and conversationId before emitting
- Clean up listeners on component unmount to prevent memory leaks
- Use socket.to() for selective broadcasting (exclude sender)
- Implement heartbeat for presence tracking
- Handle disconnections gracefully with reconnection logic

### Security Best Practices

- Never store plain text passwords (use bcrypt)
- Validate and sanitize all user inputs on server side
- Use JWT tokens with reasonable expiration times
- Implement rate limiting on sensitive endpoints (OTP, login)
- Use HTTPS in production for encrypted communication
- Validate file uploads (type, size, content)
- Use CORS whitelist in production (don't use '*')
- Store secrets in environment variables, never in code

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Authors

- **Noamaan Mulla** - [@noamaanMulla-03](https://github.com/noamaanMulla-03)

## Acknowledgments

- [Tauri](https://tauri.app/) - Desktop app framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Zustand](https://zustand-demo.pmnd.rs/) - State management

## Support

For support, email noamaan.mulla03@gmail.com or open an issue in the repository.

## Roadmap

### ✅ Completed Features
- [x] Real-time chat functionality with Socket.io
- [x] Message persistence in PostgreSQL
- [x] File sharing capabilities (images and attachments)
- [x] User profiles and settings
- [x] Group chat support
- [x] Peer-to-peer video calling with WebRTC
- [x] Desktop notifications (Tauri)
- [x] System tray integration
- [x] Typing indicators with Redis
- [x] Online/offline presence tracking

### 🚧 In Progress
- [ ] End-to-end encryption for messages
- [ ] Dark/Light theme toggle

### 📋 Planned Features
- [ ] Voice messages
- [ ] Screen sharing during video calls
- [ ] Message reactions (emoji reactions)
- [ ] Message forwarding
- [ ] Pin important messages
- [ ] Search messages within conversations
- [ ] User blocking and reporting
- [ ] Custom notification sounds
- [ ] Message threading (replies)
- [ ] Export chat history
- [ ] Multi-device synchronization
- [ ] Status updates (like WhatsApp stories)
- [ ] Audio calls (voice-only mode)
- [ ] Desktop badge count for unread messages

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
