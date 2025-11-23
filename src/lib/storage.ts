// Secure storage utility using Tauri's store plugin
// This replaces localStorage with encrypted storage via macOS Keychain

import { Store } from '@tauri-apps/plugin-store';

// Initialize the store (lazy loaded)
let store: Store | null = null;

async function getStore(): Promise<Store> {
    if (!store) {
        store = await Store.load('auth.dat');
    }
    return store;
}

export const secureStorage = {
    // Set an item in secure storage
    async setItem(key: string, value: string): Promise<void> {
        const s = await getStore();
        await s.set(key, value);
        await s.save();
    },

    // Get an item from secure storage
    async getItem(key: string): Promise<string | null> {
        const s = await getStore();
        const value = await s.get<string>(key);
        return value ?? null;
    },

    // Remove an item from secure storage
    async removeItem(key: string): Promise<void> {
        const s = await getStore();
        await s.delete(key);
        await s.save();
    },

    // Clear all items from secure storage
    async clear(): Promise<void> {
        const s = await getStore();
        await s.clear();
        await s.save();
    },

    // Check if a key exists
    async has(key: string): Promise<boolean> {
        const s = await getStore();
        return await s.has(key);
    }
};
