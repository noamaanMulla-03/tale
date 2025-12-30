// ============================================================================
// USER API SERVICE - HTTP requests for user-related functionality
// ============================================================================
// Handles user search, profile viewing, and other user operations
// Uses axios instance from @/lib/api for authentication
// ============================================================================

// Import axios instance (with auth interceptors)
import api from '@/lib/api';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * User search result object
 * Contains public user information for display in search results
 */
export interface UserSearchResult {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
}

/**
 * User search response from API
 * Includes search results and metadata
 */
export interface UserSearchResponse {
    users: UserSearchResult[];
    query: string;
    count: number;
}

// ============================================================================
// USER SEARCH API CALLS
// ============================================================================

/**
 * Search for users by username or display name
 * Uses case-insensitive partial matching
 * Excludes current user from results
 * 
 * @param searchQuery - Search term to match (min 2 characters)
 * @returns Promise with array of matching users
 * 
 * @example
 * const results = await searchUsers('john');
 * // Returns: { users: [...], query: 'john', count: 5 }
 */
export const searchUsers = async (searchQuery: string): Promise<UserSearchResponse> => {
    try {
        // Validate search query before making API call
        if (!searchQuery || searchQuery.trim().length < 2) {
            throw new Error('Search query must be at least 2 characters');
        }

        // GET request to /auth/users/search with query parameter
        const response = await api.get('/auth/users/search', {
            params: { q: searchQuery.trim() }
        });

        // Log the response for debugging
        console.log(`[+] Found ${response.data.count} users matching "${searchQuery}"`);

        // Return search results
        return response.data;
    } catch (error) {
        // Log the error with context
        console.error('[!] Error searching users:', error);
        throw error;
    }
};

/**
 * Get detailed information about a specific user (future)
 * Currently not implemented - placeholder for future enhancement
 * 
 * @param userId - ID of the user to fetch
 * @returns Promise with user details
 */
export const getUserById = async (userId: number) => {
    try {
        // GET request to /users/:id
        const response = await api.get(`/users/${userId}`);

        console.log(`[+] Fetched user details for ID: ${userId}`);
        return response.data.user;
    } catch (error) {
        console.error('[!] Error fetching user:', error);
        throw error;
    }
};
