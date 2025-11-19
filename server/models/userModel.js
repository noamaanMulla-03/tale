// import the query function from db.js
import { query } from "../db.js";

// user model object
const userModel = {

    // create a new user
    createUser: async (username, email, hashedPassword) => {
        // create query text and parameters
        const queryText = "INSERT INTO users(username, email, password_hash) VALUES($1, $2, $3) RETURNING id, username, email";
        const queryParams = [username, email, hashedPassword];

        try {
            // execute the query
            const res = await query(queryText, queryParams);
            return res.rows[0];
        } catch (err) {
            // handle errors
            console.error(`[-] Error creating user: ${err.message}`);
            throw err;
        }
    },

    // find user by email
    findUserByEmail: async (email) => {
        // create query text and parameters
        const queryText = "SELECT id, username, email, password_hash FROM users WHERE email = $1";
        const queryParams = [email];
        try {
            // execute the query
            const res = await query(queryText, queryParams);
            return res.rows[0];
        } catch (err) {
            // handle errors
            console.error(`[-] Error finding user by email and password: ${err.message}`);
            throw err;
        }
    },
};

// export the user model
export default userModel;