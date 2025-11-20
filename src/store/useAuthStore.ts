// import zustand to create a store for managing authentication state
import { create } from 'zustand';

// import persist middleware to enable state persistence
// and createJSONStorage to specify storage type
import { persist, createJSONStorage } from 'zustand/middleware';

// import the SessionState type for type safety
import { SessionState } from '@/types';

// create the authentication store using zustand
const useAuthStore = create<SessionState>()(
    persist(
        (set, get) => ({

            // initial state values
            isAuthenticated: false,
            user: null,
            token: null,

            // define login action to update the store state
            login: (user, token) => {
                // set state
                set({
                    isAuthenticated: true,
                    user: user,
                    token: token,
                });
                // store token in local storage
                localStorage.setItem('token', token);
            },

            // define logout action to reset the store state
            logout: () => {
                // reset state
                set({
                    isAuthenticated: false,
                    user: null,
                    token: null,
                });
                // remove token from local storage
                localStorage.removeItem('token');
            },

            // helper fx to get the current auth token
            getToken: () => get().token,

            // check if user is authenticated
            checkAuth: () => {
                // get current state of auth
                const state = get();
                // get token from local storage
                const token = localStorage.getItem('token');
                // return true if token exists 
                // and isAuthenticated is true
                // and token matches the stored token
                return !!token && state.isAuthenticated && state.token === token;
            }
        }),
        {
            // unique name for the storage
            name: 'auth-storage',
            // use localStorage for persistence
            storage: createJSONStorage(() => localStorage),
            // only persist these fields
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
            })
        }
    )
);

// export auth store
export default useAuthStore;