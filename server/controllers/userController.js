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

            // destructure user data to exclude password_hash
            const userData = { id: user.id, username: user.username, email: user.email };
            // generate a jwt token
            const token = generateToken(userData);

            // respond with user data
            res.status(200).json({user: userData, token});

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

    // Verify OTP (to be implemented)
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
    }
};

// export the user controller
export default userController;