// define auth routes here
import express from 'express';

// import user controller
import userController from '../controllers/userController.js';

// initialize router
const router = express.Router();

// login route
router.post('/login', userController.loginUser);
// register route
router.post('/register', userController.createUser);

// export router
export default router;