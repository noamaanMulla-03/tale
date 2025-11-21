// import user model
import userModel from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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
};

// export the user controller
export default userController;