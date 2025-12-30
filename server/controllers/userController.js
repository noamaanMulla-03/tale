// import user model
import userModel from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Resend } from "resend";
import generateOTPEmailTemplate from "./OTPTemplate.js";
import "dotenv/config";
import Redis from "ioredis";

// new resend instance
const resend = new Resend(process.env.RESEND_API_KEY)

// temporary map for otp (USE REDIS IN PROD)
const redis = new Redis(process.env.REDIS_URL);

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
        
        // max 3 requests
        const RATE_LIMIT = 3; 
        // per 15 minutes in seconds
        const RATE_LIMIT_WINDOW = 15 * 60; 
        // initialize rate limit key with email
        const rateLimitKey = `otp_rate_limit:${email}`;

        // increment request count
        const currentRequests = await redis.incr(rateLimitKey);

        // if current requests === 1, set expiration
        if (currentRequests === 1) await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW);

        // check if rate limit exceeded
        if (currentRequests > RATE_LIMIT) {
            // get time to live for the key
            const ttl = await redis.ttl(rateLimitKey);
            // convert ttl to minutes and seconds
            const minutes = Math.floor(ttl / 60);
            const seconds = ttl % 60;

            // return rate limit error with time to wait
            return res.status(429).json({ error: `Too many OTP requests. Please try again in ${minutes} minutes and ${seconds} seconds.` });
        }

        const OTP = generateEmailOTP();

        try {
            const emailTemplate = generateOTPEmailTemplate(OTP);

            // REDIS CHANGE: Set key with Expiration (EX) in seconds
            // key: "otp:user@email.com"
            // value: "123456"
            // options: EX 300 (5 minutes)
            await redis.set(`otp:${email}`, OTP, 'EX', 300);
            
            await resend.emails.send({
                from: 'Tale <onboarding@resend.dev>',
                to: email,
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

        // basic validation
        if(!email || !otp) return res.status(400).json({error: "Email and OTP are required!"});

        try {
            // REDIS CHANGE: Retrieve the OTP
            const storedOTP = await redis.get(`otp:${email}`);

            // check if OTP exists
            if (!storedOTP) return res.status(400).json({error: "OTP invalid or expired. Please request a new one."});

            // Check if OTP matches
            if (storedOTP !== otp) return res.status(400).json({error: "Invalid OTP."});

            // OTP is valid - clear it and update user
            await redis.del(`otp:${email}`);

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
    }
};

// export the user controller
export default userController;