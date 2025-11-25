// import user model
import userModel from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Resend } from "resend";
import generateOTPEmailTemplate from "./OTPTemplate.js";
import "dotenv/config";

// generate token function
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

// new resend instance
const resend = new Resend(process.env.RESEND_API_KEY)

// generate random 6-digit OTP for email verification
const generateEmailOTP = () => crypto.randomInt(100000, 999999).toString();

// temporary map for otp (USE REDIS IN PROD)
const OTPStore = new Map();

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

        // TODO: Add rate limiting here (max 3 requests per 15 minutes)

        const OTP = generateEmailOTP();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

        // Store OTP with expiration
        OTPStore.set(email, { OTP, expiresAt });

        // Log OTP in development for testing
        if (process.env.NODE_ENV === 'development') {
            console.log(`📧 OTP for ${email}: ${OTP}`);
        }

        try {
            const emailTemplate = generateOTPEmailTemplate(OTP);
            
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

        if(!email || !otp) {
            return res.status(400).json({error: "Email and OTP are required!"});
        }

        const storedData = OTPStore.get(email);

        if (!storedData) {
            return res.status(400).json({error: "No OTP found. Please request a new one."});
        }

        // Check if OTP has expired
        if (Date.now() > storedData.expiresAt) {
            OTPStore.delete(email);
            return res.status(400).json({error: "OTP has expired. Please request a new one."});
        }

        // Check if OTP matches
        if (storedData.OTP !== otp) {
            return res.status(400).json({error: "Invalid OTP."});
        }

        // OTP is valid - clear it and update user
        OTPStore.delete(email);

        try {
            // TODO: Update user's email_verified status in database
            // await userModel.updateEmailVerified(email, true);

            res.status(200).json({ message: "Email verified successfully!" });
        } catch (error) {
            console.error('Failed to verify email:', error);
            next(error);
        }
    }
};

// export the user controller
export default userController;