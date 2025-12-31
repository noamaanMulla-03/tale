// Get API URL from environment variables
// Defaults to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// WebSocket URL (can be same as API or different)
export const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

// Check if running in production
export const IS_PRODUCTION = import.meta.env.VITE_ENV === 'production';

export default API_URL;