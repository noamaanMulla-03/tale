// Desktop notification utility using Tauri's notification plugin

import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

export const notifications = {
    // Request notification permission
    async requestPermission(): Promise<boolean> {
        let permissionGranted = await isPermissionGranted();

        if (!permissionGranted) {
            const permission = await requestPermission();
            permissionGranted = permission === 'granted';
        }

        return permissionGranted;
    },

    // Send a notification
    async send(title: string, body: string): Promise<void> {
        const permissionGranted = await this.requestPermission();

        if (permissionGranted) {
            sendNotification({ title, body });
        }
    },

    // Notification for new messages
    async newMessage(username: string, message: string): Promise<void> {
        await this.send(
            `New message from ${username}`,
            message.length > 100 ? message.substring(0, 100) + '...' : message
        );
    },

    // Notification for friend requests
    async friendRequest(username: string): Promise<void> {
        await this.send(
            'New Friend Request',
            `${username} wants to connect with you`
        );
    },

    // Notification for successful login
    async loginSuccess(username: string): Promise<void> {
        await this.send(
            'Welcome back!',
            `Logged in as ${username}`
        );
    },

    // Generic success notification
    async success(message: string): Promise<void> {
        await this.send('Success', message);
    },

    // Generic error notification
    async error(message: string): Promise<void> {
        await this.send('Error', message);
    }
};
