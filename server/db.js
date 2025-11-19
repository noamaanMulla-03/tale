// import dotenv
import dotenv from "dotenv";
// import Pool from pg
import { Pool } from "pg";

dotenv.config();

// create a new pool instance
const pool = new Pool({
    // user: 'your_username',
    user: process.env.POSTGRES_USER,
    // host: 'localhost',
    host: process.env.POSTGRES_HOST,
    // database: 'your_database',
    database: process.env.POSTGRES_DB,
    // password: 'your_password',
    password: process.env.POSTGRES_PASSWORD,
    // port: 5432,
    port: parseInt(process.env.POSTGRES_PORT, 10),
});

// log connection status
pool.on('connect', () => {
    console.log(`[+] Connected to the PostgreSQL database on port: ${process.env.POSTGRES_PORT}`);
});

// log errors
pool.on('error', (err) => {
    console.error(`[-] Unexpected error on idle client: ${err.stack}`);
    process.exit(1);
});

// helper function to run db queries
const query = (query, params) => pool.query(query, params)

// export the pool instance
export { query, pool };