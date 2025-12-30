// Chat Header Component
// Displays contact info, online status, and action buttons at the top of chat area

import { Contact } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, Video, MoreVertical, Search } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatHeaderProps {
    contact: Contact;
}

export function ChatHeader({ contact }: ChatHeaderProps) {
    // Get initials from contact name for avatar fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();
    };

    // Get status text based on contact status
    const getStatusText = () => {
        if (contact.online) {
            return 'Active now';
        }
        return 'Offline';
    };

    // Get status color based on contact status
    const getStatusColor = () => {
        return contact.online ? 'text-green-500' : 'text-gray-500';
    };

    return (
        <div className="h-20 border-b border-white/10 bg-[#2a2a2a]/95 backdrop-blur-xl px-6 flex items-center justify-between">
            {/* Left section - Contact info */}
            <div className="flex items-center gap-3">
                {/* Avatar with online indicator */}
                <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-white/10">
                        <AvatarImage src={contact.avatar} alt={contact.name} />
                        <AvatarFallback className="bg-orange-500/20 text-orange-500 font-semibold">
                            {getInitials(contact.name)}
                        </AvatarFallback>
                    </Avatar>

                    {/* Online status indicator dot */}
                    {contact.online && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#2a2a2a] rounded-full" />
                    )}
                </div>

                {/* Contact name and status */}
                <div>
                    <h2 className="text-white font-semibold text-lg">
                        {contact.name}
                    </h2>
                    <p className={`text-xs ${getStatusColor()}`}>
                        {getStatusText()}
                    </p>
                </div>
            </div>

            {/* Right section - Action buttons */}
            <div className="flex items-center gap-2">
                {/* Search in conversation button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-white hover:bg-white/10"
                    title="Search in conversation"
                >
                    <Search className="h-5 w-5" />
                </Button>

                {/* Voice call button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-white hover:bg-white/10"
                    title="Voice call"
                >
                    <Phone className="h-5 w-5" />
                </Button>

                {/* Video call button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-white hover:bg-white/10"
                    title="Video call"
                >
                    <Video className="h-5 w-5" />
                </Button>

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
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
