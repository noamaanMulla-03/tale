// Contact List Item Component
// Displays a single contact in the sidebar with avatar, name, last message preview, and unread count

import { Contact } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

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
    const formattedTime = formatDistanceToNow(contact.lastMessageTime, { addSuffix: false });

    return (
        <div
            onClick={onClick}
            className={cn(
                // Base styles for the contact item
                "flex items-center gap-3 p-4 cursor-pointer transition-all duration-200 border-l-2",
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
            {/* Avatar with online status indicator */}
            <div className="relative flex-shrink-0">
                <Avatar className="h-12 w-12 border-2 border-white/10">
                    <AvatarImage src={contact.avatar} alt={contact.name} />
                    <AvatarFallback className="bg-orange-500/20 text-orange-500 font-semibold">
                        {getInitials(contact.name)}
                    </AvatarFallback>
                </Avatar>

                {/* Online status dot */}
                {contact.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#2a2a2a] rounded-full" />
                )}
            </div>

            {/* Contact info section */}
            <div className="flex-1 min-w-0 overflow-hidden">
                {/* Name and time row */}
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-white font-semibold text-sm truncate">
                        {contact.name}
                    </h3>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formattedTime}
                    </span>
                </div>

                {/* Last message preview and unread badge row */}
                <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-xs truncate flex-1">
                        {contact.lastMessage}
                    </p>

                    {/* Unread message count badge */}
                    {contact.unreadCount > 0 && (
                        <Badge
                            className="ml-2 bg-orange-500 hover:bg-orange-600 text-white text-xs px-2 py-0.5 min-w-[20px] justify-center"
                        >
                            {contact.unreadCount}
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
}
