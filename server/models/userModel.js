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

    // find user by ID
    findUserById: async (id) => {
        // create query text and parameters
        const queryText = "SELECT id, username, email FROM users WHERE id = $1";
        const queryParams = [id];

        try {
            // execute the query
            const res = await query(queryText, queryParams);
            return res.rows[0];
        } catch (err) {
            // handle errors
            console.error(`[-] Error finding user by ID: ${err.message}`);
            throw err;
        }
    },
};

// export the user model
export default userModel;