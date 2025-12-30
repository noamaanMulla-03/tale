// Message Bubble Component
// Displays individual chat message with sender info and timestamp
// Handles both sent (right-aligned) and received (left-aligned) messages

import { Message } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns/format';

interface MessageBubbleProps {
    message: Message;
    // Show avatar for received messages
    showAvatar?: boolean;
    // Group consecutive messages from same sender
    isGrouped?: boolean;
}

export function MessageBubble({ message, showAvatar = true, isGrouped = false }: MessageBubbleProps) {
    // Get initials from sender name for avatar fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();
    };

    // Format timestamp to show time (e.g., "2:30 PM")
    const formattedTime = format(new Date(message.timestamp), 'p');

    // Determine if message is sent by current user (will be enhanced with actual user ID check)
    // For now, check if sender name is "You" or compare sender ID with current user
    const isSent = message.senderName === 'You';

    return (
        <div
            className={cn(
                "flex gap-3 mb-4",
                // Align sent messages to the right
                isSent && "justify-end",
                // Reduce bottom margin for grouped messages
                isGrouped && "mb-1"
            )}
        >
            {/* Avatar for received messages (left side) */}
            {!isSent && showAvatar && (
                <Avatar className="h-8 w-8 flex-shrink-0 border border-white/10">
                    <AvatarImage src={message.senderAvatar} alt={message.senderName} />
                    <AvatarFallback className="bg-orange-500/20 text-orange-500 text-xs font-semibold">
                        {getInitials(message.senderName)}
                    </AvatarFallback>
                </Avatar>
            )}

            {/* Spacer for grouped messages without avatar */}
            {!isSent && !showAvatar && (
                <div className="w-8 shrink-0" />
            )}

            {/* Message content bubble */}
            <div
                className={cn(
                    "flex flex-col max-w-[70%]",
                    isSent && "items-end"
                )}
            >
                {/* Sender name (only for received messages and first in group) */}
                {!isSent && showAvatar && (
                    <span className="text-xs text-gray-400 mb-1 ml-1">
                        {message.senderName}
                    </span>
                )}

                {/* The actual message bubble */}
                <div
                    className={cn(
                        "px-4 py-2.5 rounded-2xl break-words",
                        // Sent message styling - orange gradient
                        isSent && "bg-gradient-to-br from-orange-500 to-orange-600 text-white",
                        // Received message styling - dark gray
                        !isSent && "bg-[#3a3a3a] text-white",
                        // Add shadow for depth
                        "shadow-lg"
                    )}
                >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                    </p>
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
