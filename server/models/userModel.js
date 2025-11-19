import query from "../db";

const userModel = {
    createUser: async (username, email, hashedPassword) => {
        const queryText = "INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING id, username, email";
        const queryParams = [username, email, hashedPassword];
        try {
            const res = await query(queryText, queryParams);
            return res.rows[0];
        } catch (err) {
            console.error(`[-] Error creating user: ${err.message}`);
            throw err;
        }
    },

    findUserById: async (id) => {
        const queryText = "SELECT id, username, email FROM users WHERE id = $1";
        const queryParams = [id];
        try {
            const res = await query(queryText, queryParams);
            return res.rows[0];
        } catch (err) {
            console.error(`[-] Error finding user by ID: ${err.message}`);
            throw err;
        }
    },
};

export default userModel;