// import the query function from db.js
import query from "../db";

// user model object
const userModel = {

    // create a new user
    createUser: async (username, email, hashedPassword) => {
        // create query text and parameters
        const queryText = "INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id, username, email";
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

    // find user by email and password
    findUserByEmailandPassword: async (email, password) => {
        // create query text and parameters
        const queryText = "SELECT id, username, email FROM users WHERE username = $1 AND password = $2";
        const queryParams = [email, password];
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