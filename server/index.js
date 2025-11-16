// filename: server/index.js
import express from 'express';

// initialize the server
const app = express();

// server port
const PORT = 3000;

// create an express server
app.get('/', (req, res) => {
    res.send('<h1>Hello, Express.js Server!</h1>');
});

// start the server
app.listen(`${PORT}`, () => {
    console.log(`[+] Server running on Port: ${PORT}`)
});