// auth routes
import express from 'express';

const router = express.Router();

// login route
router.post('/login', (req, res) => {
    // handle login logic here
    res.send('Login route');
});

// register route
router.post('/register', (req, res) => {
    // handle registration logic here
    res.send('Register route');
});

export default router;