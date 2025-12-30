// define auth routes here
import express from 'express';

// import user controller
import userController from '../controllers/userController.js';

// import middleware
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

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

// profile setup route (protected, with file upload)
router.post('/profile-setup', authenticateToken, upload.single('avatar'), userController.setupUserProfile);

// get user profile route (protected)
router.get('/profile', authenticateToken, userController.getUserProfileData);

// export router
export default router;