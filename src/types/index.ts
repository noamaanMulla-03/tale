// interface for the user object
interface User {
    id: string,
    username: string,
    email: string,
};

// interface for the AuthResponse which contains
// user object and token
interface AuthResponse {
    user: User,
    token: string,
};

// export types
export type { User, AuthResponse };