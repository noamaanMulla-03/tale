// Main Chat Page Component
// Implements the complete chat interface with contacts sidebar and chat area
// Uses static mock data for development

import { useState, useRef, useEffect } from 'react';
import { mockContacts, mockMessages } from '@/data/mockChatData';
import { Contact, Message } from '@/types/chat';
import { ContactItem } from '@/features/chat/components/ContactItem';
import { ChatHeader } from '@/features/chat/components/ChatHeader';
import { MessageBubble } from '@/features/chat/components/MessageBubble';
import { MessageInput } from '@/features/chat/components/MessageInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Menu, LogOut, Settings, User } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function ChatPage() {
    // Get user info and logout function from auth store
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    // State for selected contact (currently active chat)
    const [selectedContact, setSelectedContact] = useState<Contact | null>(mockContacts[0]);
    // State for all contacts list
    const [contacts, setContacts] = useState<Contact[]>(mockContacts);
    // State for search query in contacts
    const [searchQuery, setSearchQuery] = useState('');
    // State for messages of the selected contact
    const [messages, setMessages] = useState<Message[]>(mockMessages['1'] || []);
    // Ref for auto-scrolling to bottom of messages
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Scroll to bottom of messages container
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Handle contact selection from sidebar
    const handleContactSelect = (contact: Contact) => {
        setSelectedContact(contact);
        // Load messages for the selected contact
        setMessages(mockMessages[contact.id] || []);
        // Mark messages as read when opening chat
        setContacts(prevContacts =>
            prevContacts.map(c =>
                c.id === contact.id ? { ...c, unreadCount: 0 } : c
            )
        );
    };

    // Handle sending a new message
    const handleSendMessage = (content: string) => {
        if (!selectedContact) return;

        // Create new message object
        const newMessage: Message = {
            id: `m${Date.now()}`,
            senderId: 'me',
            senderName: 'You',
            content,
            timestamp: new Date(),
            isRead: false,
            isSent: true
        };

        // Add message to current conversation
        setMessages(prev => [...prev, newMessage]);

        // Update last message in contacts list
        setContacts(prevContacts =>
            prevContacts.map(c =>
                c.id === selectedContact.id
                    ? { ...c, lastMessage: content, lastMessageTime: new Date() }
                    : c
            )
        );

        // TODO: Send message to backend via WebSocket or API
    };

    // Filter contacts based on search query
    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handle logout
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Get user initials for avatar fallback
    const getUserInitials = () => {
        if (!user?.username) return 'U';
        return user.username.substring(0, 2).toUpperCase();
    };

    // Check if consecutive messages are from the same sender for grouping
    const shouldShowAvatar = (index: number) => {
        if (index === 0) return true;
        const currentMessage = messages[index];
        const previousMessage = messages[index - 1];
        return currentMessage.senderId !== previousMessage.senderId;
    };

    return (
        <div className="h-screen flex bg-[#1a1a1a] overflow-hidden">
            {/* Left Sidebar - Contacts List */}
            <div className="w-80 border-r border-white/10 flex flex-col bg-[#2a2a2a]/95 backdrop-blur-xl">
                {/* Sidebar Header with user info */}
                <div className="h-20 border-b border-white/10 px-4 flex items-center justify-between">
                    {/* Logo/Title */}
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                            <div className="w-6 h-6 rounded-full border-2 border-orange-500/50" />
                        </div>
                        <h1 className="text-xl font-bold text-white">
                            <span className="text-orange-500">Tale</span>
                        </h1>
                    </div>

                    {/* User profile dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-white hover:bg-white/10"
                            >
                                <Avatar className="h-8 w-8 border border-white/10">
                                    <AvatarImage src={user?.avatarUrl} alt={user?.username} />
                                    <AvatarFallback className="bg-orange-500/20 text-orange-500 text-xs font-semibold">
                                        {getUserInitials()}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-48 bg-[#2a2a2a] border-white/20 text-white"
                        >
                            <DropdownMenuItem
                                onClick={() => navigate('/profile-setup')}
                                className="focus:bg-white/10 focus:text-white cursor-pointer"
                            >
                                <User className="mr-2 h-4 w-4" />
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="focus:bg-red-500/20 focus:text-red-500 text-red-500 cursor-pointer"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Search bar */}
                <div className="p-4 border-b border-white/10">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                        <Input
                            type="text"
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-[#1a1a1a]/50 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50"
                        />
                    </div>
                </div>

                {/* Contacts list */}
                <ScrollArea className="flex-1">
                    <div className="space-y-0">
                        {filteredContacts.length > 0 ? (
                            filteredContacts.map((contact) => (
                                <ContactItem
                                    key={contact.id}
                                    contact={contact}
                                    isActive={selectedContact?.id === contact.id}
                                    onClick={() => handleContactSelect(contact)}
                                />
                            ))
                        ) : (
                            // No contacts found message
                            <div className="p-8 text-center text-gray-500">
                                <p className="text-sm">No conversations found</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Right Side - Chat Area */}
            <div className="flex-1 flex flex-col">
                {selectedContact ? (
                    <>
                        {/* Chat header with contact info */}
                        <ChatHeader contact={selectedContact} />

                        {/* Messages area */}
                        <ScrollArea className="flex-1 bg-[#1a1a1a]">
                            <div className="p-6">
                                {messages.length > 0 ? (
                                    messages.map((message, index) => (
                                        <MessageBubble
                                            key={message.id}
                                            message={message}
                                            showAvatar={shouldShowAvatar(index)}
                                            isGrouped={!shouldShowAvatar(index)}
                                        />
                                    ))
                                ) : (
                                    // No messages yet
                                    <div className="flex items-center justify-center h-full text-gray-500">
                                        <p className="text-sm">No messages yet. Start the conversation!</p>
                                    </div>
                                )}
                                {/* Auto-scroll anchor */}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* Message input */}
                        <MessageInput onSendMessage={handleSendMessage} />
                    </>
                ) : (
                    // No contact selected - show welcome message
                    <div className="flex-1 flex items-center justify-center bg-[#1a1a1a]">
                        <div className="text-center space-y-4">
                            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mx-auto border border-white/10">
                                <div className="w-16 h-16 rounded-full border-4 border-orange-500/50" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">
                                Welcome to <span className="text-orange-500">Tale</span>
                            </h2>
                            <p className="text-gray-400 max-w-md">
                                Select a conversation from the sidebar to start chatting.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChatPage;
