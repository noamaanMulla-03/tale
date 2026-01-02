// File Attachment Dialog Component
// Allows users to select and preview files before sending

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Paperclip, File, Image as ImageIcon, FileText, Film, Music } from 'lucide-react';

interface FileAttachmentDialogProps {
    open: boolean;
    onClose: () => void;
    onSendFile: (file: File, caption?: string) => Promise<void>;
}

// File size limits (in bytes)
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed file types
const ALLOWED_FILE_TYPES = [
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
    'video/mp4', 'video/webm', 'video/ogg',
];

export function FileAttachmentDialog({ open, onClose, onSendFile }: FileAttachmentDialogProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [caption, setCaption] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset error
        setError(null);

        // Validate file type
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            setError(`File type "${file.type}" is not allowed`);
            return;
        }

        // Validate file size
        const maxSize = file.type.startsWith('image/') ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
        if (file.size > maxSize) {
            const maxSizeMB = maxSize / (1024 * 1024);
            setError(`File size must be less than ${maxSizeMB}MB`);
            return;
        }

        setSelectedFile(file);

        // Generate preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewUrl(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setPreviewUrl(null);
        }
    };

    // Handle send
    const handleSend = async () => {
        if (!selectedFile) return;

        setIsSending(true);
        setError(null);

        try {
            await onSendFile(selectedFile, caption || undefined);

            // Reset and close
            handleClose();
        } catch (err) {
            console.error('Failed to send file:', err);
            setError(err instanceof Error ? err.message : 'Failed to send file');
        } finally {
            setIsSending(false);
        }
    };

    // Handle close and cleanup
    const handleClose = () => {
        setSelectedFile(null);
        setCaption('');
        setError(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onClose();
    };

    // Get file icon based on type
    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <ImageIcon className="h-12 w-12" />;
        if (type.startsWith('video/')) return <Film className="h-12 w-12" />;
        if (type.startsWith('audio/')) return <Music className="h-12 w-12" />;
        if (type === 'application/pdf' || type.includes('document') || type.includes('text')) {
            return <FileText className="h-12 w-12" />;
        }
        return <File className="h-12 w-12" />;
    };

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px] bg-[#2a2a2a] border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-white">Send File</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* File input */}
                    {!selectedFile && (
                        <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-white/40 transition-colors">
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileSelect}
                                className="hidden"
                                accept={ALLOWED_FILE_TYPES.join(',')}
                            />
                            <Paperclip className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-white mb-2">Select a file to send</p>
                            <p className="text-sm text-gray-400 mb-4">
                                Max {(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB for files, {(MAX_IMAGE_SIZE / (1024 * 1024)).toFixed(0)}MB for images
                            </p>
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-orange-500 hover:bg-orange-600"
                            >
                                Choose File
                            </Button>
                        </div>
                    )}

                    {/* File preview */}
                    {selectedFile && (
                        <div className="space-y-3">
                            <div className="relative bg-[#1a1a1a] rounded-lg p-4">
                                {/* Preview */}
                                {previewUrl ? (
                                    <div className="mb-3">
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="w-full h-48 object-contain rounded-lg bg-black/50"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-32 text-gray-400 mb-3">
                                        {getFileIcon(selectedFile.type)}
                                    </div>
                                )}

                                {/* File info */}
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">
                                            {selectedFile.name}
                                        </p>
                                        <p className="text-gray-400 text-xs">
                                            {formatFileSize(selectedFile.size)}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            setSelectedFile(null);
                                            setPreviewUrl(null);
                                            if (fileInputRef.current) {
                                                fileInputRef.current.value = '';
                                            }
                                        }}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Caption input */}
                            <div>
                                <Input
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    placeholder="Add a caption (optional)"
                                    className="bg-[#1a1a1a] border-white/10 text-white"
                                    maxLength={200}
                                />
                                <p className="text-xs text-gray-500 mt-1">{caption.length}/200</p>
                            </div>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSending}
                        className="border-white/10 text-white hover:bg-white/10"
                    >
                        Cancel
                    </Button>
                    {!selectedFile ? (
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-orange-500 hover:bg-orange-600"
                        >
                            Choose File
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSend}
                            disabled={isSending}
                            className="bg-orange-500 hover:bg-orange-600"
                        >
                            {isSending ? 'Sending...' : 'Send'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
