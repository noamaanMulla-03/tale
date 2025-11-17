// filename: server/index.js
import express from 'express';

// import auth routes
import authRoutes from './routes/auth.js';

// initialize the server
const app = express();
// server port
const PORT = 3000;

// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use((err, _, res) => {
    console.error(`[-] Error: ${err.stack}`);
    res.status(500).json({ error: 'Something went wrong!' });
});

// start the server
app.listen(`${PORT}`, () => {
    console.log(`[+] Server running on Port: ${PORT}`)
});