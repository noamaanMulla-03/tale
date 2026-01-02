// import dotenv
import dotenv from "dotenv";
// import Pool from pg
import { Pool } from "pg";

dotenv.config();

// ============================================================================
// POSTGRESQL CONNECTION POOL CONFIGURATION
// ============================================================================
// Optimized pool settings for production chat application
// Based on enterprise best practices (Slack, Discord patterns)
// ============================================================================

// Create a new pool instance with optimized configuration
const pool = new Pool({
    // ========================================================================
    // Basic Connection Settings
    // ========================================================================
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT, 10),
    
    // ========================================================================
    // Connection Pool Settings (OPTIMIZED FOR PRODUCTION)
    // ========================================================================
    
    // Maximum number of clients in the pool
    // Default: 10 (too low for production)
    // Recommended: 20-50 for chat applications
    // Formula: (number_of_cores * 2) + number_of_disk_drives
    // For 4-core server: (4 * 2) + 1 = 9, rounded up to 20 for headroom
    max: parseInt(process.env.POSTGRES_MAX_POOL, 10) || 20,
    
    // Minimum number of clients to keep alive
    // Keeps connections warm for instant queries
    // Prevents cold start latency on first request
    min: parseInt(process.env.POSTGRES_MIN_POOL, 10) || 5,
    
    // How long a client is allowed to remain idle before being closed
    // 30 seconds - balances connection reuse with resource cleanup
    // Idle connections consume minimal resources but prevent reconnection overhead
    idleTimeoutMillis: 30000,
    
    // Maximum time to wait for a connection from the pool
    // 10 seconds - fail fast if pool is exhausted
    // Prevents request hanging when database is overloaded
    connectionTimeoutMillis: 10000,
    
    // ========================================================================
    // Query Timeout Settings
    // ========================================================================
    
    // Maximum time a query can run before being killed
    // 10 seconds - prevents runaway queries from locking resources
    // Long-running analytics queries should use separate read replica
    statement_timeout: 10000,
    
    // Overall query execution timeout (includes network time)
    query_timeout: 10000,
    
    // ========================================================================
    // Connection Settings for Performance
    // ========================================================================
    
    // Enable keepalive to detect dead connections
    // Sends TCP keepalive packets every 5 seconds
    // Prevents "connection lost" errors on idle connections
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
    
    // Application name for PostgreSQL logs
    // Helps identify connections in pg_stat_activity
    application_name: 'tale-chat-server',
});

// ============================================================================
// POOL EVENT HANDLERS (Monitoring & Health Checks)
// ============================================================================

// Log successful connections (useful for debugging connection issues)
pool.on('connect', (client) => {
    console.log(`[+] PostgreSQL client connected from pool (total active: ${pool.totalCount})`);
    
    // Set timezone for this connection (ensures consistent timestamp handling)
    client.query('SET TIME ZONE \'UTC\'');
    
    // Enable prepared statement optimization
    // PostgreSQL caches execution plans for faster repeated queries
    client.query('SET plan_cache_mode = auto');
});

// Log when client is acquired from pool (for monitoring)
pool.on('acquire', (client) => {
    // Optional: Uncomment for detailed connection debugging
    // console.log(`[*] Client acquired from pool (waiting: ${pool.waitingCount})`);
});

// Log when client is removed from pool
pool.on('remove', (client) => {
    console.log(`[-] PostgreSQL client removed from pool (total active: ${pool.totalCount})`);
});

// Handle unexpected errors on idle clients in the pool
// This prevents app crashes from connection errors
pool.on('error', (err, client) => {
    console.error(`[-] Unexpected error on idle PostgreSQL client:`, err);
    console.error(`[-] Client info:`, {
        database: client?.database,
        host: client?.host,
        port: client?.port,
        processID: client?.processID
    });
    
    // In production, send error to monitoring service (Sentry, DataDog, etc.)
    // Example: Sentry.captureException(err);
    
    // Don't exit process - let pool handle reconnection
    // In dev/testing, you may want to exit(1) to catch issues early
    if (process.env.NODE_ENV === 'development') {
        console.error(`[-] Pool error in development mode - consider restarting server`);
    }
});

// helper function to run db queries
const query = (query, params) => pool.query(query, params)

// export the pool instance
export { query, pool };