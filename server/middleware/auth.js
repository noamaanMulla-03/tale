import jwt from 'jsonwebtoken';
import 'dotenv/config';

// middleware to verify JWT token
export const authenticateToken = (req, res, next) => {
    // get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        console.log('[-] No token provided');
        return res.status(401).json({ error: 'Access token required!' });
    }

    try {
        // verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // attach user info to request
        req.user = decoded;
        console.log('[+] Token verified for user:', decoded.id);
        next();
    } catch (err) {
        console.error('[-] Token verification failed:', err.message);
        console.error('[-] Token:', token.substring(0, 20) + '...');
        console.error('[-] JWT_SECRET exists:', !!process.env.JWT_SECRET);
        return res.status(403).json({ error: 'Invalid or expired token!' });
    }
};
