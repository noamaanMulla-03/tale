// import user model
import userModel from "../models/userModel.js";
import bcrypt from "bcryptjs";

// user controller object
const userController = {

    // create a new user
    createUser: async (req, res, next) => {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        try {
            // create the user using username, email, and hashed password
            const newUser = await userModel.createUser(username, email, hashedPassword);
            // respond with the new user data
            res.status(201).json(newUser);
        } catch (err) {
            // pass errors to error handling middleware
            next(err);
        }
    },

    // get user by ID
    getUserByEmailandPassword: async (req, res, next) => {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        try {
            // find the user using email and hashed password
            const user = await userModel.findUserByEmailandPassword(email, hashedPassword);

            // respond with user data or error
            if (user)
                res.status(200).json(user);
            else
                res.status(404).json({ error: 'Invalid Email or Password!' });

        } catch (err) {
            // pass errors to error handling middleware
            next(err);
        }
    }, 
};

// export the user controller
export default userController;