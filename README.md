# Tale

A modern desktop chat application built with Tauri, React, TypeScript, and PostgreSQL. Tale provides a meaningful way to follow and manage your conversations with a beautiful, dark-themed interface.

## Features

- **Desktop Application** - Cross-platform desktop app powered by Tauri
- **Secure Authentication** - User registration, Login, and Email Verification via OTP
- **Rate Limiting** - Redis-backed protection against spam and abuse
- **State Management** - Zustand for global state with localStorage persistence
- **Modern UI** - Dark theme with shadcn/ui components and Tailwind CSS v4
- **Protected Routes** - Client-side route guards for authenticated pages
- **Real-time Ready** - Socket.io integration for future real-time features
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
- **Database**: PostgreSQL
- **Cache & Rate Limiting**: Redis (ioredis)
- **Email Service**: Resend
- **Authentication**: bcryptjs, JWT (JSON Web Tokens)
- **Real-time**: Socket.io (ready for implementation)

## Prerequisites

- **Node.js** (v18 or higher)
- **Rust** (latest stable)
- **PostgreSQL** (v14 or higher)
- **Redis** (local instance or cloud url)
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

```bash
# Create a new database
createdb tale

# Run migrations (create users table)
psql -d tale -f server/migrations/create_users_table.sql
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

# JWT secret key for authentication
JWT_SECRET=your_jwt_secret_key

# (Get your Resend API key from https://resend.com)
RESEND_URL=

# Redis connection URL
REDIS_URL=redis://localhost:6379
```

## Running the Application

### Development Mode

**Terminal 1 - Backend Server:**
```bash
cd server
npm run dev
```

**Terminal 2 - Tauri Desktop App:**
```bash
npm run tauri dev
```

The backend API will run on `http://localhost:3000` and the Tauri app will launch automatically.

**Terminal 3 - Redis Database (If running locally):**
```bash
redis-server
```

### Production Build

```bash
# Build the frontend and Tauri app
npm run tauri build

# The installer will be in src-tauri/target/release/bundle/
```

## Project Structure

```
tale/
├── src/                          # Frontend React application
│   ├── components/               # Reusable UI components
│   │   └── ui/                   # shadcn/ui components
│   ├── features/                 # Feature-based modules
│   │   └── auth/                 # Authentication feature
│   │       └── components/       # Login/Signup forms
│   ├── lib/                      # Utility functions
│   │   ├── api.ts               # API client (axios)
│   │   └── utils.ts             # Helper utilities
│   ├── pages/                    # Page components
│   │   └── AuthPage.tsx         # Auth wrapper page
│   ├── router/                   # Routing configuration
│   │   └── ProtectedRoute.tsx   # Route guard
│   ├── store/                    # State management
│   │   └── useAuthStore.ts      # Auth state (Zustand)
│   ├── types/                    # TypeScript interfaces
│   │   └── index.ts             # Type definitions
│   ├── config/                   # App configuration
│   │   └── index.ts             # API URL config
│   └── App.tsx                   # Root component
├── server/                       # Backend Express server
│   ├── controllers/              # Request handlers
│   │   └── userController.js    # User operations
│   ├── models/                   # Database models
│   │   └── userModel.js         # User model
│   ├── routes/                   # API routes
│   │   └── auth.js              # Auth endpoints
│   ├── db.js                     # PostgreSQL connection
│   ├── index.js                  # Server entry point
│   └── package.json              # Backend dependencies
├── src-tauri/                    # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs              # Entry point
│   │   └── lib.rs               # Tauri commands
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
├── components.json               # shadcn/ui config
├── tailwind.config.js           # Tailwind CSS config
└── vite.config.ts               # Vite configuration
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

### Verification (OTP)

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

## UI Components

The project uses [shadcn/ui](https://ui.shadcn.com/) components with custom dark theme:

- `Button` - Interactive buttons with variants
- `Card` - Container for content
- `Input` - Form input fields
- `InputOTP` - 6-digit verification code input
- `Label` - Form labels
- `Field` - Form field wrapper with validation
- `Separator` - Visual dividers
- `Progress` - Visual timer for OTP expiration
- `Toast (Sonner)` - Notification system

Add more components:
```bash
npx shadcn@latest add [component-name]
```

## Authentication Flow

1. User submits login/signup form
2. Frontend sends credentials to backend API
3. Backend validates and hashes password (bcrypt)
4. Backend returns user data + JWT token
5. Frontend stores token in Zustand + localStorage
6. Protected routes check authentication status
7. API requests include token in headers

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Features

- Password hashing with bcrypt (10 rounds)
- Protected routes with authentication guards
- CORS configuration for frontend-backend communication
- Rate Limiting: Redis counters prevent OTP spam (Max 3 attempts per 15 mins)
- TTL Expiry: OTPs automatically expire from Redis after 5 minutes
- Environment variable management with dotenv
- Type-safe API calls with TypeScript
- SQL injection prevention with parameterized queries

## 🧪 Testing

```bash
# Backend
cd server
npm test

# Frontend
npm test
```

## Development Guidelines

### Code Style

- Use TypeScript for all frontend code
- Follow React hooks best practices
- Use async/await over promises
- Implement proper error handling
- Add comments for complex logic

### State Management

- Use Zustand for global state
- Keep component state local when possible
- Persist auth state to localStorage
- Use type-safe store slices

### API Integration

- Centralize API calls in `lib/api.ts`
- Use axios interceptors for auth headers
- Handle errors consistently
- Type all API responses

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

- [ ] Real-time chat functionality with Socket.io
- [ ] Message persistence in PostgreSQL
- [ ] File sharing capabilities
- [ ] User profiles and settings
- [ ] Group chat support
- [ ] End-to-end encryption
- [ ] Desktop notifications
- [ ] Dark/Light theme toggle

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
