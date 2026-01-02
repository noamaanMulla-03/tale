// Desktop notification utility
// Supports both Tauri desktop app and web browser notifications

import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

// Check if running in Tauri (desktop app) vs web browser
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

export const notifications = {
    // Request notification permission (works for both Tauri and web)
    async requestPermission(): Promise<boolean> {
        if (isTauri) {
            // Tauri desktop app
            let permissionGranted = await isPermissionGranted();

            if (!permissionGranted) {
                const permission = await requestPermission();
                permissionGranted = permission === 'granted';
            }

            return permissionGranted;
        } else {
            // Web browser
            if (!('Notification' in window)) {
                console.warn('[Notifications] Browser does not support notifications');
                return false;
            }

            if (Notification.permission === 'granted') {
                return true;
            }

            if (Notification.permission === 'denied') {
                return false;
            }

            // Request permission
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
    },

    // Check if permission is already granted
    async isPermissionGranted(): Promise<boolean> {
        if (isTauri) {
            return await isPermissionGranted();
        } else {
            return 'Notification' in window && Notification.permission === 'granted';
        }
    },

    // Send a notification
    async send(title: string, body: string, options?: { icon?: string; tag?: string; onClick?: () => void }): Promise<void> {
        // Don't show notification if window is focused (user is already viewing)
        if (!isTauri && document.hasFocus()) {
            return;
        }

        const permissionGranted = await this.requestPermission();

        if (!permissionGranted) {
            console.warn('[Notifications] Permission not granted');
            return;
        }

        if (isTauri) {
            // Tauri desktop notification
            sendNotification({ title, body });
        } else {
            // Web browser notification
            try {
                const notification = new Notification(title, {
                    body,
                    icon: options?.icon || '/logo.png',
                    tag: options?.tag || `notification-${Date.now()}`,
                    requireInteraction: false,
                    silent: false,
                });

                // Handle notification click
                notification.onclick = () => {
                    window.focus();
                    if (options?.onClick) {
                        options.onClick();
                    }
                    notification.close();
                };

                // Auto-close after 5 seconds
                setTimeout(() => {
                    notification.close();
                }, 5000);
            } catch (error) {
                console.error('[Notifications] Error showing notification:', error);
            }
        }
    },

    // Notification for new messages
    async newMessage(
        username: string,
        message: string,
        options?: {
            avatar?: string;
            conversationId?: number;
            onClick?: () => void;
        }
    ): Promise<void> {
        const truncatedMessage = message.length > 100
            ? message.substring(0, 100) + '...'
            : message;

        await this.send(
            `New message from ${username}`,
            truncatedMessage,
            {
                icon: options?.avatar,
                tag: options?.conversationId ? `conversation-${options.conversationId}` : undefined,
                onClick: options?.onClick,
            }
        );
    },

    // Notification for group messages
    async groupMessage(
        groupName: string,
        senderName: string,
        message: string,
        options?: {
            avatar?: string;
            conversationId?: number;
            onClick?: () => void;
        }
    ): Promise<void> {
        const truncatedMessage = message.length > 80
            ? message.substring(0, 80) + '...'
            : message;

        await this.send(
            groupName,
            `${senderName}: ${truncatedMessage}`,
            {
                icon: options?.avatar,
                tag: options?.conversationId ? `conversation-${options.conversationId}` : undefined,
                onClick: options?.onClick,
            }
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
