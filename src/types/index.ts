// interface for the user object
interface User {
    id: string,
    avatarUrl?: string,
    username: string,
    email: string,
};

// interface for login credentials
// extends User interface by picking
// only email
interface LoginCredentials extends Pick<User, 'email'> {
    password: string,
}

// interface for registration data
// extends User interface by omitting
// id
interface RegistrationData extends Omit<User, 'id'> {
    password: string,
}

// interface for the AuthResponse which contains
// user object and token
interface AuthResponse {
    user: User,
    token: string,
};

// interface for the session state in zustand store
interface SessionState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (user: User, token: string) => void;
    logout: () => void;
    checkAuth: () => Promise<boolean>;
};

// export types
export type { User, LoginCredentials, RegistrationData, AuthResponse, SessionState };