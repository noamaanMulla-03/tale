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

// send/resend OTP email
router.post('/send-otp', userController.sendOTP);
// verify OTP
router.post('/verify-otp', userController.verifyOTP);

// export router
export default router;