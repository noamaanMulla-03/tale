// import the query function from db.js
import { query } from "../db.js";

// user model object
const userModel = {

    // create a new user
    createUser: async (username, email, hashedPassword) => {
        // create query text and parameters - use username as initial display_name
        const queryText = "INSERT INTO users(username, email, password_hash, display_name) VALUES($1, $2, $3, $1) RETURNING id, username, email, display_name";
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
        const queryText = "SELECT id, username, email, password_hash, email_verified, avatar_url, display_name FROM users WHERE email = $1";
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

    // verify user email
    verifyUserEmail: async (email) => {
        // create query text and parameters
        const queryText = "UPDATE users SET email_verified = $1 WHERE email = $2";
        const queryParams = [true, email];

        try {
            // execute the query
            await query(queryText, queryParams);
        } catch (err) {
            // handle errors
            console.error(`[-] Error updating email verified status: ${err.message}`);
            throw err;
        }
    },

    // update user profile (users table only)
    updateUserDisplayName: async (userId, displayName) => {
        const queryText = `
            UPDATE users 
            SET display_name = $1
            WHERE id = $2
            RETURNING id, username, email, display_name, avatar_url
        `;
        const queryParams = [displayName, userId];

        try {
            const res = await query(queryText, queryParams);
            return res.rows[0];
        } catch (err) {
            console.error(`[-] Error updating display name: ${err.message}`);
            throw err;
        }
    },

    // create or update profile (profiles table)
    upsertProfile: async (userId, profileData) => {
        const { gender, dob, phoneNumber, bio } = profileData;
        
        const queryText = `
            INSERT INTO profiles (user_id, gender, dob, phone_number, bio, profile_completed_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                gender = EXCLUDED.gender,
                dob = EXCLUDED.dob,
                phone_number = EXCLUDED.phone_number,
                bio = EXCLUDED.bio,
                profile_completed_at = CURRENT_TIMESTAMP
            RETURNING user_id, gender, dob, phone_number, bio, profile_completed_at
        `;
        const queryParams = [userId, gender || null, dob, phoneNumber, bio || null];

        try {
            const res = await query(queryText, queryParams);
            return res.rows[0];
        } catch (err) {
            console.error(`[-] Error upserting profile: ${err.message}`);
            throw err;
        }
    },

    // get user profile by id (JOIN users and profiles)
    getUserProfile: async (userId) => {
        const queryText = `
            SELECT u.id, u.username, u.email, u.display_name, u.avatar_url, u.created_at,
                   p.bio, p.phone_number, p.gender, p.dob, p.profile_completed_at
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.id = $1
        `;
        const queryParams = [userId];

        try {
            const res = await query(queryText, queryParams);
            return res.rows[0];
        } catch (err) {
            console.error(`[-] Error getting user profile: ${err.message}`);
            throw err;
        }
    },

    // update user avatar
    updateUserAvatar: async (userId, avatarUrl) => {
        const queryText = "UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING avatar_url";
        const queryParams = [avatarUrl, userId];

        try {
            const res = await query(queryText, queryParams);
            return res.rows[0];
        } catch (err) {
            console.error(`[-] Error updating user avatar: ${err.message}`);
            throw err;
        }
    },
};

// export the user model
export default userModel;