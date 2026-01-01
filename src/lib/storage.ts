// Secure storage utility with fallback for web and Tauri environments
// Uses Tauri's encrypted store in desktop app, localStorage in web browser

import { Store } from '@tauri-apps/plugin-store';

// Detect if running in Tauri environment
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// Initialize the store (lazy loaded, only for Tauri)
let store: Store | null = null;

async function getStore(): Promise<Store> {
    if (!store && isTauri) {
        store = await Store.load('auth.dat');
    }
    return store!;
}

// Web storage fallback (uses localStorage)
const webStorage = {
    async setItem(key: string, value: string): Promise<void> {
        localStorage.setItem(key, value);
    },

    async getItem(key: string): Promise<string | null> {
        return localStorage.getItem(key);
    },

    async removeItem(key: string): Promise<void> {
        localStorage.removeItem(key);
    },

    async clear(): Promise<void> {
        localStorage.clear();
    },

    async has(key: string): Promise<boolean> {
        return localStorage.getItem(key) !== null;
    }
};

// Tauri secure storage
const tauriStorage = {
    async setItem(key: string, value: string): Promise<void> {
        const s = await getStore();
        await s.set(key, value);
        await s.save();
    },

    async getItem(key: string): Promise<string | null> {
        const s = await getStore();
        const value = await s.get<string>(key);
        return value ?? null;
    },

    async removeItem(key: string): Promise<void> {
        const s = await getStore();
        await s.delete(key);
        await s.save();
    },

    async clear(): Promise<void> {
        const s = await getStore();
        await s.clear();
        await s.save();
    },

    async has(key: string): Promise<boolean> {
        const s = await getStore();
        return await s.has(key);
    }
};

// Export the appropriate storage based on environment
export const secureStorage = isTauri ? tauriStorage : webStorage;
