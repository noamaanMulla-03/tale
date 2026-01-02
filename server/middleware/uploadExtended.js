import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// FILE UPLOAD CONFIGURATION
// ============================================================================
// Handles uploads for avatars, chat attachments, and other file types
// Supports images, documents, videos, and audio files

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, '../uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');
const attachmentsDir = path.join(uploadsDir, 'attachments');

[uploadsDir, avatarsDir, attachmentsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================

// Storage for avatars
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, avatarsDir);
    },
    filename: (req, file, cb) => {
        // generate unique filename: userId-timestamp.ext
        const userId = req.user?.id || 'temp';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${userId}-${uniqueSuffix}${ext}`);
    }
});

// Storage for chat attachments (files, images, videos, etc.)
const attachmentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, attachmentsDir);
    },
    filename: (req, file, cb) => {
        // generate unique filename: userId-timestamp-originalname
        const userId = req.user?.id || 'temp';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        // Sanitize filename: remove special characters
        const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '_');
        cb(null, `${userId}-${uniqueSuffix}-${sanitizedName}${ext}`);
    }
});

// ============================================================================
// FILE FILTERS
// ============================================================================

// File filter - only allow images (for avatars)
const imageFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// File filter - allow various file types for chat attachments
const attachmentFilter = (req, file, cb) => {
    // Allowed extensions
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|7z|mp3|wav|ogg|webm|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    // Allowed MIME types
    const allowedMimeTypes = [
        // Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        // Archives
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        // Audio
        'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
        // Video
        'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
    ];
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed! Allowed types: images, documents, archives, audio, video'), false);
    }
};

// ============================================================================
// MULTER CONFIGURATIONS
// ============================================================================

// Avatar upload configuration (5MB limit, images only)
export const upload = multer({
    storage: avatarStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit for avatars
    },
    fileFilter: imageFilter
});

// Attachment upload configuration (25MB limit, multiple file types)
export const attachmentUpload = multer({
    storage: attachmentStorage,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB limit for general files
    },
    fileFilter: attachmentFilter
});

// Image attachment upload configuration (10MB limit, images only)
export const imageUpload = multer({
    storage: attachmentStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for images
    },
    fileFilter: imageFilter
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get file URL from filename
 * Constructs the full URL for accessing an uploaded file
 * 
 * @param {string} filename - The filename (e.g., "123-1234567890-file.pdf")
 * @param {string} type - The file type ("avatar" or "attachment")
 * @returns {string} The full URL to access the file
 */
export function getFileUrl(filename, type = 'avatar') {
    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const folder = type === 'avatar' ? 'avatars' : 'attachments';
    return `${baseUrl}/uploads/${folder}/${filename}`;
}

/**
 * Delete uploaded file
 * Removes a file from the filesystem
 * 
 * @param {string} filename - The filename to delete
 * @param {string} type - The file type ("avatar" or "attachment")
 * @returns {boolean} True if deleted successfully, false otherwise
 */
export function deleteFile(filename, type = 'avatar') {
    try {
        const folder = type === 'avatar' ? avatarsDir : attachmentsDir;
        const filePath = path.join(folder, filename);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('[Upload] Error deleting file:', error);
        return false;
    }
}
