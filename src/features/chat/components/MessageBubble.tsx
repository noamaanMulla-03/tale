// ============================================================================
// MESSAGE BUBBLE COMPONENT
// ============================================================================
// Displays individual chat message with sender info and timestamp
// Handles both sent (right-aligned) and received (left-aligned) messages
// Properly aligns messages based on sender ID vs current user ID
// ============================================================================

import { Message } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns/format';
import useAuthStore from '@/store/useAuthStore';
import { File, Download, FileText, Film, Music, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageBubbleProps {
    message: Message;
    // Show avatar for received messages
    showAvatar?: boolean;
    // Group consecutive messages from same sender
    isGrouped?: boolean;
    // Whether this is a group chat (always show sender names for received messages)
    isGroupChat?: boolean;
}

export function MessageBubble({ message, showAvatar = true, isGrouped = false, isGroupChat = false }: MessageBubbleProps) {
    // Get current user from auth store to determine message alignment
    const { user } = useAuthStore();

    // Get initials from sender name for avatar fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();
    };

    // Format timestamp to show time (e.g., "2:30 PM")
    let formattedTime = '';
    try {
        const date = new Date(message.timestamp);
        if (!isNaN(date.getTime())) {
            formattedTime = format(date, 'p');
        } else {
            formattedTime = 'Now';
        }
    } catch (error) {
        formattedTime = 'Now';
    }

    // **FIX**: Determine if message is sent by current user
    // Compare sender ID with current user ID (not sender name)
    // Messages sent by current user appear on the right (orange)
    // Messages from other users appear on the left (gray)
    const isSent = user?.id ? message.senderId === parseInt(user.id) : false;

    // Get file icon based on message type or file name
    const getFileIcon = () => {
        if (message.messageType === 'image') return <ImageIcon className="h-5 w-5" />;
        if (message.messageType === 'video') return <Film className="h-5 w-5" />;
        if (message.messageType === 'audio') return <Music className="h-5 w-5" />;
        if (message.fileName?.endsWith('.pdf') || message.fileName?.includes('doc')) {
            return <FileText className="h-5 w-5" />;
        }
        return <File className="h-5 w-5" />;
    };

    // Format file size
    const formatFileSize = (bytes?: number): string => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Render file/image content
    const renderMediaContent = () => {
        // Image message
        if (message.messageType === 'image' && message.fileUrl) {
            return (
                <div className="mb-2">
                    <a
                        href={message.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                    >
                        <img
                            src={message.fileUrl}
                            alt={message.fileName || 'Image'}
                            className="max-w-full rounded-lg max-h-96 object-contain hover:opacity-90 transition-opacity"
                        />
                    </a>
                </div>
            );
        }

        // File attachment (document, video, audio, etc.)
        if ((message.messageType === 'file' || message.messageType === 'video' || message.messageType === 'audio') && message.fileUrl) {
            return (
                <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg mb-2">
                    <div className={cn(
                        "p-2 rounded-lg",
                        isSent ? "bg-white/10" : "bg-orange-500/10"
                    )}>
                        {getFileIcon()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                            {message.fileName || 'File'}
                        </p>
                        {message.fileSize && (
                            <p className="text-xs opacity-70">
                                {formatFileSize(message.fileSize)}
                            </p>
                        )}
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                            "h-8 w-8 shrink-0",
                            isSent ? "text-white hover:bg-white/10" : "text-white hover:bg-white/10"
                        )}
                        onClick={() => message.fileUrl && window.open(message.fileUrl, '_blank')}
                        title="Download"
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            );
        }

        return null;
    };

    return (
        <div
            className={cn(
                "flex gap-2 md:gap-3 mb-3 md:mb-4",
                // Align sent messages to the right
                isSent && "justify-end",
                // Reduce bottom margin for grouped messages
                isGrouped && "mb-1"
            )}
        >
            {/* Avatar for received messages (left side) */}
            {!isSent && showAvatar && (
                <Avatar className="h-7 w-7 md:h-8 md:w-8 shrink-0 border border-white/10">
                    <AvatarImage src={message.senderAvatar} alt={message.senderName} />
                    <AvatarFallback className="bg-orange-500/20 text-orange-500 text-xs font-semibold">
                        {getInitials(message.senderName)}
                    </AvatarFallback>
                </Avatar>
            )}

            {/* Spacer for grouped messages without avatar */}
            {!isSent && !showAvatar && (
                <div className="w-7 md:w-8 shrink-0" />
            )}

            {/* Message content bubble */}
            <div
                className={cn(
                    "flex flex-col max-w-[85%] sm:max-w-[75%] md:max-w-[70%]",
                    isSent && "items-end"
                )}
            >
                {/* Sender name for received messages */}
                {/* Show if: not sent by current user AND (it's a group chat OR it's the first message in sequence) */}
                {!isSent && (isGroupChat || showAvatar) && (
                    <span className="text-xs text-gray-400 mb-1 ml-1">
                        {message.senderName}
                    </span>
                )}

                {/* The actual message bubble */}
                <div
                    className={cn(
                        "px-3 py-2 md:px-4 md:py-2.5 rounded-2xl break-words",
                        // Sent message styling - orange gradient
                        isSent && "bg-gradient-to-br from-orange-500 to-orange-600 text-white",
                        // Received message styling - dark gray
                        !isSent && "bg-[#3a3a3a] text-white",
                        // Add shadow for depth
                        "shadow-lg"
                    )}
                >
                    {/* Render file/image content if present */}
                    {renderMediaContent()}

                    {/* Text content (caption for files or regular message) */}
                    {message.content && (
                        <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                            {message.content}
                        </p>
                    )}
                </div>

                {/* Timestamp and read status */}
                <div
                    className={cn(
                        "flex items-center gap-1 mt-1 px-1",
                        isSent && "justify-end"
                    )}
                >
                    <span className="text-xs text-gray-500">
                        {formattedTime}
                    </span>

                    {/* Read indicator for sent messages */}
                    {isSent && (
                        <span className="text-xs">
                            {message.read ? (
                                // Double check mark for read
                                <span className="text-orange-400">✓✓</span>
                            ) : (
                                // Single check mark for delivered
                                <span className="text-gray-500">✓</span>
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
