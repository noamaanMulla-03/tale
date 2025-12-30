// ============================================================================
// AVATAR UTILITIES
// ============================================================================
// Shared utilities for handling avatar URLs across the application
// ============================================================================

import API_URL from '@/config';

/**
 * Convert relative avatar URL to absolute URL
 * If URL is already absolute (starts with http/https), returns as-is
 * Otherwise, prepends API_URL to make it absolute
 * 
 * @param avatarUrl - Relative or absolute avatar URL
 * @returns Absolute avatar URL or undefined if input is null/undefined
 * 
 * @example
 * getAvatarUrl('/uploads/avatars/user.jpg') // => 'http://localhost:3000/uploads/avatars/user.jpg'
 * getAvatarUrl('https://example.com/avatar.jpg') // => 'https://example.com/avatar.jpg'
 * getAvatarUrl(null) // => undefined
 */
export function getAvatarUrl(avatarUrl?: string | null): string | undefined {
    if (!avatarUrl) return undefined;

    // If URL is already absolute, return as-is
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
        return avatarUrl;
    }

    // Otherwise, prepend API_URL
    return `${API_URL}${avatarUrl}`;
}

/**
 * Get user initials from username or name for avatar fallback
 * Takes first 2 characters and converts to uppercase
 * 
 * @param name - Username or display name
 * @returns Two uppercase characters for avatar fallback
 * 
 * @example
 * getUserInitials('john_doe') // => 'JO'
 * getUserInitials('Sarah') // => 'SA'
 * getUserInitials('') // => 'U'
 */
export function getUserInitials(name?: string): string {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
}
