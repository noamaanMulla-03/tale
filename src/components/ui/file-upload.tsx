import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileImage, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    onFileRemove?: () => void;
    accept?: Record<string, string[]>;
    maxSize?: number;
    preview?: string | null;
    disabled?: boolean;
    className?: string;
    children?: React.ReactNode;
}

export function FileUpload({
    onFileSelect,
    onFileRemove,
    accept = {
        'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxSize = 5 * 1024 * 1024, // 5MB default
    preview,
    disabled = false,
    className,
    children,
}: FileUploadProps) {
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
        setError(null);

        if (rejectedFiles.length > 0) {
            const rejection = rejectedFiles[0];
            if (rejection.errors[0]?.code === 'file-too-large') {
                setError(`File is too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
            } else if (rejection.errors[0]?.code === 'file-invalid-type') {
                setError('Invalid file type. Please upload an image file.');
            } else {
                setError('Failed to upload file. Please try again.');
            }
            return;
        }

        if (acceptedFiles.length > 0) {
            onFileSelect(acceptedFiles[0]);
        }
    }, [maxSize, onFileSelect]);

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        onDrop,
        accept,
        maxSize,
        multiple: false,
        disabled,
        noClick: false,
        noKeyboard: false,
    });

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        setError(null);
        onFileRemove?.();
    };

    return (
        <div
            {...getRootProps()}
            className={cn(
                'relative w-full border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden',
                'focus:outline-none focus:ring-2 focus:ring-orange-500/50',
                isDragActive && !isDragReject && 'border-orange-500 bg-orange-500/10',
                isDragReject && 'border-red-500 bg-red-500/10',
                !isDragActive && !preview && 'border-white/10 hover:border-orange-500/50 bg-[#1a1a1a]/50',
                disabled && 'cursor-not-allowed opacity-50',
                preview && 'border-transparent',
                className
            )}
        >
            <input {...getInputProps()} />

            {preview ? (
                <>
                    <div className="absolute inset-0 pointer-events-none">
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    {!disabled && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                            <div className="flex flex-col items-center gap-2 text-white">
                                <Upload className="h-8 w-8" />
                                <p className="text-sm font-medium">Drag new image or click</p>
                            </div>
                        </div>
                    )}
                    {!disabled && onFileRemove && (
                        <button
                            onClick={handleRemove}
                            className="absolute top-2 right-2 p-2 bg-black/80 hover:bg-red-500 rounded-full transition-colors duration-200 z-10"
                            type="button"
                        >
                            <X className="h-4 w-4 text-white" />
                        </button>
                    )}
                </>
            ) : (
                children || (
                    <div className="flex flex-col items-center justify-center h-full w-full py-8 px-6 text-center">
                        <div className={cn(
                            'p-4 rounded-full mb-4 transition-colors duration-200',
                            isDragActive && !isDragReject ? 'bg-orange-500/20' : 'bg-white/5'
                        )}>
                            {isDragReject ? (
                                <AlertCircle className="h-8 w-8 text-red-500" />
                            ) : (
                                <FileImage className="h-8 w-8 text-orange-500" />
                            )}
                        </div>

                        {isDragActive ? (
                            <p className="text-white font-medium">
                                {isDragReject ? 'Invalid file type' : 'Drop the file here'}
                            </p>
                        ) : (
                            <>
                                <p className="text-white font-medium mb-2">
                                    Drag & drop an image here
                                </p>
                                <p className="text-gray-400 text-sm mb-4">
                                    or click to browse
                                </p>
                                <p className="text-gray-500 text-xs">
                                    PNG, JPG, GIF up to {(maxSize / 1024 / 1024).toFixed(0)}MB
                                </p>
                            </>
                        )}
                    </div>
                )
            )}
            <input {...getInputProps()} />

            {error && (
                <div className="absolute -bottom-8 left-0 flex items-center gap-2 text-red-500 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}

// Avatar-specific upload component
interface AvatarUploadProps {
    onFileSelect: (file: File) => void;
    currentAvatar?: string;
    username?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-48 h-48',
    xl: 'w-64 h-64',
};

export function AvatarUpload({
    onFileSelect,
    currentAvatar,
    username = 'User',
    size = 'md'
}: AvatarUploadProps) {
    const [preview, setPreview] = useState<string | null>(currentAvatar || null);

    const handleFileSelect = (file: File) => {
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Pass file to parent
        onFileSelect(file);
    };

    const handleRemove = () => {
        setPreview(currentAvatar || null);
    };

    return (
        <div className={cn('relative group', sizeClasses[size])}>
            <FileUpload
                onFileSelect={handleFileSelect}
                onFileRemove={handleRemove}
                preview={preview}
                maxSize={5 * 1024 * 1024}
                accept={{
                    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
                }}
                className="w-full h-full"
            >
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <span className="text-6xl font-bold">
                        {username.charAt(0).toUpperCase()}
                    </span>
                </div>
            </FileUpload>
        </div>
    );
}
