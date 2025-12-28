// filename: server/index.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// import dotenv to manage environment variables
import dotenv from 'dotenv';
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// import db connection
import { pool } from './db.js';

// import auth routes
import authRoutes from './routes/auth.js';

// initialize the server
const app = express();
// server port from environment variables
const PORT = process.env.PORT || 3000;

// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CORS for frontend
app.use((_, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// create an express server
app.get('/', (_, res) => {
    res.send('<h1>Hello, Express.js Server!</h1>');
});

// login routes
app.use('/auth', authRoutes);

// error handling middlewares
app.use((err, req, res, next) => {
    // Handle multer file upload errors
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File size too large! Maximum 5MB allowed.' });
        }
        return res.status(400).json({ error: `File upload error: ${err.message}` });
    }
    
    // Handle custom multer errors (from fileFilter)
    if (err.message === 'Only image files are allowed!') {
        return res.status(400).json({ error: err.message });
    }
    
    console.error(`[-] Error: ${err.stack}`);
    res.status(500).json({ error: 'Something went wrong!' });
});

// test database connection at startup
pool.query('SELECT NOW()')
    .catch(err => console.error(`[-] Database connection failed: ${err.message}`));

// start the server
app.listen(PORT, () => {
    console.log(`[+] Server running on Port: ${PORT}`)
});