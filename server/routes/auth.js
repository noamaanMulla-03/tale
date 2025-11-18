// define auth routes here
import express from 'express';

// initialize router
const router = express.Router();

// login route
router.post('/login', (req, res) => {
    // handle login logic here
    console.log(req.body);
    // res.send('Login route');
    res.sendStatus(404);
});

// register route
router.post('/register', (req, res) => {
    // handle registration logic here
    res.send('Register route');
});

// export router
export default router;