// import zustand to create a store for managing authentication state
import { create } from 'zustand';

// import persist middleware to enable state persistence
// and createJSONStorage to specify storage type
import { persist, createJSONStorage } from 'zustand/middleware';

// import the SessionState type for type safety
import { SessionState } from '@/types';

// import secure storage utility
import { secureStorage } from '@/lib/storage';

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
                // store token in secure storage (macOS Keychain)
                secureStorage.setItem('token', token).catch(console.error);
            },

            // define logout action to reset the store state
            logout: () => {
                // reset state
                set({
                    isAuthenticated: false,
                    user: null,
                    token: null,
                });
                // remove token from secure storage
                secureStorage.removeItem('token').catch(console.error);
            },

            // helper fx to get the current auth token
            getToken: () => get().token,

            // update user data
            updateUser: (userData) => {
                const currentUser = get().user;
                if (currentUser) {
                    set({ user: { ...currentUser, ...userData } });
                }
            },

            // check if user is authenticated
            checkAuth: async () => {
                // get current state of auth
                const state = get();
                // get token from secure storage
                const token = await secureStorage.getItem('token');
                // return true if token exists 
                // and isAuthenticated is true
                // and token matches the stored token
                return !!token && state.isAuthenticated && state.token === token;
            }
        }),
        {
            // unique name for the storage
            name: 'auth-storage',
            // use secure storage for persistence
            storage: createJSONStorage(() => ({
                // get item from secure storage
                getItem: async (name) => {
                    const value = await secureStorage.getItem(name);
                    return value;
                },

                // set item in secure storage
                setItem: async (name, value) => {
                    await secureStorage.setItem(name, value);
                },

                // remove item from secure storage
                removeItem: async (name) => {
                    await secureStorage.removeItem(name);
                }
            })),

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