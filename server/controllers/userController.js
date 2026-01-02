// import user model
import userModel from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sgMail from "@sendgrid/mail";
import generateOTPEmailTemplate from "./OTPTemplate.js";
import "dotenv/config";

// Import centralized Redis service for all Redis operations
import redisService from "../services/redisService.js";

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// generate random 6-digit OTP for email verification
const generateEmailOTP = () => crypto.randomInt(100000, 999999).toString();

// generate token function
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

// user controller object
const userController = {

    // create a new user
    createUser: async (req, res, next) => {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        try {
            // create the user using username, email, and hashed password
            const newUser = await userModel.createUser(username, email, hashedPassword);
            // generate a token for the new user
            const token = generateToken(newUser);

            // respond with the new user data
            res.status(201).json({user: newUser, token});
        } catch (err) {
            // pass errors to error handling middleware
            next(err);
        }
    },

    // get user by ID
    loginUser: async (req, res, next) => {
        const { email, password } = req.body;

        try {
            // find the user using email and hashed password
            const user = await userModel.findUserByEmail(email);

            // respond with user data or error
            if (!user)
                return res.status(401).json({error: 'Invalid Email or Password!'});
            
            // compare passwords
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            if (!isPasswordValid)
                return res.status(401).json({error: 'Invalid Email or Password!'});

            // Get profile completion status
            const profile = await userModel.getUserProfile(user.id);
            const profileCompleted = !!profile?.profile_completed_at;

            // destructure user data to exclude password_hash
            // Map snake_case DB fields to camelCase for frontend
            const userData = { 
                id: user.id, 
                username: user.username, 
                email: user.email,
                avatarUrl: user.avatar_url, // Map snake_case to camelCase
                profileCompleted 
            };
            // generate a jwt token
            const token = generateToken(userData);

            // respond with user data including email verification status
            res.status(200).json({
                user: userData, 
                token,
                email_verified: user.email_verified
            });

        } catch (err) {
            // pass errors to error handling middleware
            next(err);
        }
    }, 

    // Send/Resend OTP email
    sendOTP: async (req, res, next) => {
        const { email } = req.body;

        if(!email) return res.status(400).json({error: "Email is required!"});
        
        // ====================================================================
        // RATE LIMITING (Using centralized Redis service)
        // ====================================================================
        // Prevents spam: Max 3 OTP requests per 15 minutes
        // Uses Redis counter with TTL for automatic cleanup
        // ====================================================================
        const RATE_LIMIT = 3; 
        const RATE_LIMIT_WINDOW = 15 * 60; // 15 minutes in seconds
        
        // Increment rate limit counter (auto-expires after window)
        const currentRequests = await redisService.incrementRateLimit(email, RATE_LIMIT_WINDOW);

        // Check if rate limit exceeded
        if (currentRequests > RATE_LIMIT) {
            // Get remaining time until rate limit resets
            const ttl = await redisService.getRateLimitTTL(email);
            const minutes = Math.floor(ttl / 60);
            const seconds = ttl % 60;

            // Return 429 Too Many Requests with helpful message
            return res.status(429).json({ 
                error: `Too many OTP requests. Please try again in ${minutes} minutes and ${seconds} seconds.` 
            });
        }

        // ====================================================================
        // GENERATE AND SEND OTP
        // ====================================================================
        const OTP = generateEmailOTP();

        try {
            const emailTemplate = generateOTPEmailTemplate(OTP);

            // Store OTP in Redis with 5-minute expiration
            // Using centralized service for consistent key naming
            await redisService.storeOTP(email, OTP);
            
            // Send email via SendGrid
            await sgMail.send({
                to: email,
                from: process.env.SENDGRID_FROM_EMAIL || 'noreply@yourdomain.com',
                subject: 'Verify your email - Tale',
                html: emailTemplate.html,
                text: emailTemplate.text
            });

            res.status(200).json({ message: "OTP sent successfully!" });
        } catch (error) {
            console.error('Failed to send OTP email:', error);
            res.status(500).json({ error: "Failed to send OTP. Please try again." });
        }
    },

    // Verify OTP 
    verifyOTP: async (req, res, next) => {
        const { email, otp } = req.body;
        // ====================================================================
        // VALIDATE INPUT
        // ====================================================================
        if(!email || !otp) {
            return res.status(400).json({error: "Email and OTP are required!"});
        }

        try {
            // ====================================================================
            // RETRIEVE AND VERIFY OTP (Using Redis service)
            // ====================================================================
            // OTP auto-expires after 5 minutes in Redis
            const storedOTP = await redisService.getOTP(email);

            // Check if OTP exists (null if expired or never created)
            if (!storedOTP) {
                return res.status(400).json({
                    error: "OTP invalid or expired. Please request a new one."
                });
            }

            // Check if OTP matches (simple string comparison)
            if (storedOTP !== otp) {
                return res.status(400).json({error: "Invalid OTP."});
            }

            // ====================================================================
            // OTP IS VALID - Delete it and update user
            // ====================================================================
            // Delete OTP to prevent reuse (one-time use only)
            await redisService.deleteOTP(email);

            // Update user's email_verified status in PostgreSQL
            // Update user's email_verified status in database
            await userModel.verifyUserEmail(email);

            res.status(200).json({ message: "Email verified successfully!" });
        } catch (error) {
            console.error('Failed to verify email:', error);
            next(error);
        }
    },

    // setup user profile
    setupUserProfile: async (req, res, next) => {
        const userId = req.user.id; // from auth middleware
        const { displayName, gender, dob, phoneNumber, bio } = req.body;
        const avatarFile = req.file; // from multer middleware

        try {
            // Validate required fields
            if (!displayName || !dob || !phoneNumber) {
                return res.status(400).json({ error: "Display name, date of birth, and phone number are required!" });
            }

            // Parse date to ensure it's valid
            const parsedDob = new Date(dob);
            if (isNaN(parsedDob.getTime())) {
                return res.status(400).json({ error: "Invalid date of birth format!" });
            }

            // 1. Update display name in users table
            await userModel.updateUserDisplayName(userId, displayName);

            // 2. Handle avatar upload if file is provided
            let avatarUrl = null;
            if (avatarFile) {
                // NOTE: Currently saving files locally to /uploads/avatars/
                // For production deployment, integrate cloud storage service:
                // - AWS S3: Use AWS SDK with S3.putObject() to upload files
                // - Cloudinary: Use cloudinary.uploader.upload() for image optimization
                // - Firebase Storage: Use firebase-admin storage bucket
                // Benefits: CDN delivery, automatic backups, unlimited scaling
                avatarUrl = `/uploads/avatars/${avatarFile.filename}`;
                await userModel.updateUserAvatar(userId, avatarUrl);
            }

            // 3. Upsert profile data into profiles table (use parsed date)
            const profileData = { gender, dob: parsedDob, phoneNumber, bio };
            await userModel.upsertProfile(userId, profileData);

            // 4. Get complete profile to return
            const completeProfile = await userModel.getUserProfile(userId);

            // Map snake_case DB fields to camelCase for frontend
            const profileResponse = {
                ...completeProfile,
                avatarUrl: completeProfile.avatar_url,
                displayName: completeProfile.display_name,
                phoneNumber: completeProfile.phone_number,
                profileCompletedAt: completeProfile.profile_completed_at
            };

            // Remove snake_case fields
            delete profileResponse.avatar_url;
            delete profileResponse.display_name;
            delete profileResponse.phone_number;
            delete profileResponse.profile_completed_at;

            // respond with updated profile data
            res.status(200).json({ profile: profileResponse });
        } catch (err) {
            // pass errors to error handling middleware
            console.error('Profile setup error:', err);
            next(err);
        }
    },

    // get user profile data
    getUserProfileData: async (req, res, next) => {
        const userId = req.user.id; // from auth middleware

        try {
            // Get complete profile
            const profile = await userModel.getUserProfile(userId);

            if (!profile) {
                return res.status(404).json({ error: 'Profile not found' });
            }

            // Map snake_case DB fields to camelCase for frontend
            const profileResponse = {
                id: profile.id,
                username: profile.username,
                email: profile.email,
                displayName: profile.display_name,
                avatarUrl: profile.avatar_url,
                bio: profile.bio,
                phoneNumber: profile.phone_number,
                gender: profile.gender,
                dob: profile.dob,
                profileCompletedAt: profile.profile_completed_at
            };

            res.status(200).json({ profile: profileResponse });
        } catch (err) {
            console.error('Get profile error:', err);
            next(err);
        }
    },

    /**
     * Search for users by username or display name
     * Protected route - requires authentication
     * Query parameter: q (search term)
     * 
     * Use cases:
     * - Find users to start new conversations
     * - Search contacts by name
     * - Auto-complete in user selection fields
     * 
     * @route GET /users/search?q=searchTerm
     * @access Protected (requires JWT token)
     */
    searchUsers: async (req, res, next) => {
        // Get search query from URL query parameters
        const searchQuery = req.query.q;
        // Get current user ID from JWT token (added by authenticateToken middleware)
        const currentUserId = req.user.id;

        try {
            // Validate search query
            if (!searchQuery || searchQuery.trim().length === 0) {
                return res.status(400).json({ 
                    error: 'Search query is required',
                    message: 'Please provide a search term using the "q" query parameter'
                });
            }

            // Minimum search length to prevent overly broad searches
            if (searchQuery.trim().length < 2) {
                return res.status(400).json({ 
                    error: 'Search query too short',
                    message: 'Please enter at least 2 characters to search'
                });
            }

            // Search for users using the model
            const users = await userModel.searchUsers(searchQuery, currentUserId);

            // Map snake_case DB fields to camelCase for frontend consistency
            const formattedUsers = users.map(user => ({
                id: user.id,
                username: user.username,
                displayName: user.display_name,
                avatarUrl: user.avatar_url
            }));

            // Respond with search results
            res.status(200).json({ 
                users: formattedUsers,
                query: searchQuery,
                count: formattedUsers.length
            });
        } catch (err) {
            // Log and pass errors to error handling middleware
            console.error('User search error:', err);
            next(err);
        }
    }
};

// export the user controller
export default userController;