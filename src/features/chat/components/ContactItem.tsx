// ============================================================================
// CONTACT LIST ITEM COMPONENT
// ============================================================================
// Displays a single contact/group in the sidebar
// Features:
// - Avatar with online indicator (direct messages only)
// - Name, last message preview, timestamp
// - Unread count badge
// - Group indicator icon for group chats
// - Participant count for groups
// ============================================================================

import { Contact } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Users } from 'lucide-react';

interface ContactItemProps {
    contact: Contact;
    isActive: boolean;
    onClick: () => void;
}

export function ContactItem({ contact, isActive, onClick }: ContactItemProps) {
    // Get initials from name for avatar fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();
    };

    // Format the timestamp to relative time (e.g., "5 minutes ago")
    let formattedTime = 'Just now';
    try {
        const date = new Date(contact.timestamp);
        if (!isNaN(date.getTime())) {
            formattedTime = formatDistanceToNow(date, { addSuffix: false });
        }
    } catch (error) {
        // Fallback to 'Just now' on error
    }

    // Determine if this is a group chat
    const isGroupChat = contact.conversationType === 'group';

    // Get display name (group name for groups, contact name for direct)
    const displayName = isGroupChat ? contact.groupName || 'Unnamed Group' : contact.name;

    // Get display avatar (group avatar for groups, contact avatar for direct)
    const displayAvatar = isGroupChat ? contact.groupAvatar || '/default-group-avatar.png' : contact.avatar;

    return (
        <div
            onClick={onClick}
            className={cn(
                // Base styles for the contact item
                "flex items-center gap-2 md:gap-3 p-3 md:p-4 cursor-pointer transition-all duration-200 border-l-2",
                // Hover state
                "hover:bg-white/5",
                // Active state - highlighted with orange border
                isActive
                    ? "bg-white/10 border-l-orange-500"
                    : "border-l-transparent",
                // Add subtle bottom border
                "border-b border-white/5"
            )}
        >
            {/* Avatar with online status indicator (direct) or group icon */}
            <div className="relative shrink-0">
                <Avatar className="h-11 w-11 md:h-12 md:w-12 border-2 border-white/10">
                    <AvatarImage src={displayAvatar} alt={displayName} />
                    <AvatarFallback className="bg-orange-500/20 text-orange-500 font-semibold">
                        {/* For groups, show Users icon instead of initials */}
                        {isGroupChat ? (
                            <Users className="h-5 w-5" />
                        ) : (
                            getInitials(displayName)
                        )}
                    </AvatarFallback>
                </Avatar>

                {/* Online status dot (only for direct messages) */}
                {!isGroupChat && contact.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#2a2a2a] rounded-full" />
                )}

                {/* Group indicator badge (only for groups) */}
                {isGroupChat && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#2a2a2a] border border-white/10 rounded-full flex items-center justify-center">
                        <Users className="h-3 w-3 text-orange-500" />
                    </div>
                )}
            </div>

            {/* Contact/Group info section */}
            <div className="flex-1 min-w-0 overflow-hidden">
                {/* Name and time row */}
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm truncate">
                            {displayName}
                        </h3>
                        {/* Participant count for groups */}
                        {isGroupChat && contact.participantCount && (
                            <span className="text-xs text-gray-500 shrink-0">
                                ({contact.participantCount})
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-gray-500 shrink-0 ml-2">
                        {formattedTime}
                    </span>
                </div>

                {/* Last message preview and unread badge row */}
                <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-xs truncate flex-1">
                        {contact.lastMessage}
                    </p>

                    {/* Unread message count badge */}
                    {contact.unread > 0 && (
                        <Badge
                            className="ml-2 bg-orange-500 hover:bg-orange-600 text-white text-xs px-2 py-0.5 min-w-5 justify-center"
                        >
                            {contact.unread}
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
}
