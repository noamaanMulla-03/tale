// ============================================================================
// CHAT HEADER COMPONENT
// ============================================================================
// Displays contact/group info, status, and action buttons at the top of chat
// Features:
// - Shows avatar, name, and online status for direct messages
// - Shows group name, participant count for group chats
// - Action buttons (search, call, video, more options)
// - Different options menu for groups vs direct messages
// ============================================================================

import { Contact } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, Video, MoreVertical, Search, Users, Info } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatHeaderProps {
    contact: Contact;
    // Optional: Callback to open group info panel
    onOpenGroupInfo?: () => void;
}

export function ChatHeader({ contact, onOpenGroupInfo }: ChatHeaderProps) {
    // Get initials from contact/group name for avatar fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();
    };

    // Determine if this is a group chat
    const isGroupChat = contact.conversationType === 'group';

    // Get status text based on contact status
    // For groups: show participant count
    // For direct: show online/offline status
    const getStatusText = () => {
        if (isGroupChat) {
            // Group: show participant count
            const count = contact.participantCount || 0;
            return `${count} ${count === 1 ? 'member' : 'members'}`;
        } else {
            // Direct message: show online status
            if (contact.online) {
                return 'Active now';
            }
            return 'Offline';
        }
    };

    // Get status color based on online status
    const getStatusColor = () => {
        if (isGroupChat) {
            return 'text-gray-400';
        }
        return contact.online ? 'text-green-500' : 'text-gray-400';
    };

    // For groups: use group name
    // For direct: use contact name
    const displayName = isGroupChat ? contact.groupName || 'Unnamed Group' : contact.name;

    // For groups: use group avatar
    // For direct: use contact avatar
    const displayAvatar = isGroupChat ? contact.groupAvatar || '/default-group-avatar.png' : contact.avatar;

    return (
        <div className="h-20 border-b border-white/10 bg-[#2a2a2a]/95 backdrop-blur-xl px-6 flex items-center justify-between">
            {/* Left section - Contact/Group info */}
            <div className="flex items-center gap-3">
                {/* Avatar with online indicator (only for direct messages) */}
                <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-white/10">
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

                    {/* Online status indicator dot (only for direct messages) */}
                    {!isGroupChat && contact.online && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#2a2a2a] rounded-full" />
                    )}
                </div>

                {/* Contact/Group name and status */}
                <div className="flex-1 min-w-0">
                    <h2 className="text-white font-semibold text-lg truncate">
                        {displayName}
                    </h2>
                    <p className={`text-xs ${getStatusColor()}`}>
                        {getStatusText()}
                    </p>
                </div>
            </div>

            {/* Right section - Action buttons */}
            <div className="flex items-center gap-2">
                {/* Group Info button (only for groups) */}
                {isGroupChat && onOpenGroupInfo && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onOpenGroupInfo}
                        className="text-gray-400 hover:text-white hover:bg-white/10"
                        title="Group info"
                    >
                        <Info className="h-5 w-5" />
                    </Button>
                )}

                {/* Search in conversation button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-white hover:bg-white/10"
                    title="Search in conversation"
                >
                    <Search className="h-5 w-5" />
                </Button>

                {/* Voice call button (only for direct messages) */}
                {!isGroupChat && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-white hover:bg-white/10"
                        title="Voice call"
                    >
                        <Phone className="h-5 w-5" />
                    </Button>
                )}

                {/* Video call button (only for direct messages) */}
                {!isGroupChat && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-white hover:bg-white/10"
                        title="Video call"
                    >
                        <Video className="h-5 w-5" />
                    </Button>
                )}

                {/* More options dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-white hover:bg-white/10"
                        >
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="w-48 bg-[#2a2a2a] border-white/20 text-white"
                    >
                        {/* Group-specific options */}
                        {isGroupChat ? (
                            <>
                                <DropdownMenuItem
                                    className="focus:bg-white/10 focus:text-white cursor-pointer"
                                    onClick={onOpenGroupInfo}
                                >
                                    Group Info
                                </DropdownMenuItem>
                                <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    Add Members
                                </DropdownMenuItem>
                                <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    Mute Notifications
                                </DropdownMenuItem>
                                <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    Search Messages
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    Clear Chat
                                </DropdownMenuItem>
                                <DropdownMenuItem className="focus:bg-red-500/20 focus:text-red-500 text-red-500 cursor-pointer">
                                    Leave Group
                                </DropdownMenuItem>
                            </>
                        ) : (
                            /* Direct message options */
                            <>
                                <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    Mute Notifications
                                </DropdownMenuItem>
                                <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    Search Messages
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    Clear Chat
                                </DropdownMenuItem>
                                <DropdownMenuItem className="focus:bg-red-500/20 focus:text-red-500 text-red-500 cursor-pointer">
                                    Block Contact
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
