// Main Chat Page Component
// Implements the complete chat interface with contacts sidebar and chat area
// Fully integrated with backend API and WebSocket for real-time features

import { useState, useRef, useEffect } from 'react';
import { Contact } from '@/types/chat';
import { ContactItem } from '@/features/chat/components/ContactItem';
import { ChatHeader } from '@/features/chat/components/ChatHeader';
import { MessageBubble } from '@/features/chat/components/MessageBubble';
import { MessageInput } from '@/features/chat/components/MessageInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, LogOut, Settings, User } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import useChatStore from '@/store/useChatStore';
import { useNavigate } from 'react-router-dom';
import { getAvatarUrl, getUserInitials } from '@/lib/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    connectSocket,
    disconnectSocket,
    joinConversation,
    leaveConversation,
    onNewMessage,
    onMessageEdited,
    onMessageDeleted,
    onUserTyping,
    onUserStopTyping,
    onUserOnline,
    onUserOffline,
    emitTyping,
    emitStopTyping,
} from '@/lib/socket';

function ChatPage() {
    // Get user info and logout function from auth store
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    // Get chat store state and actions
    const {
        conversations,
        messages: allMessages,
        selectedConversationId,
        fetchConversations,
        fetchMessages,
        sendMessage,
        setSelectedConversation,
        addMessage,
        updateMessage,
        removeMessage,
        addTypingUser,
        removeTypingUser,
        getTypingUsers,
        setUserOnline,
        setUserOffline,
        clearChatData,
    } = useChatStore();

    // Local state for search query
    const [searchQuery, setSearchQuery] = useState('');
    // Ref for auto-scrolling to bottom of messages
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get selected contact from conversations
    const selectedContact = conversations.find(
        conv => conv.conversationId === selectedConversationId
    ) || null;

    // Get messages for selected conversation
    const messages = selectedConversationId ? allMessages[selectedConversationId] || [] : [];

    // Initialize: Connect WebSocket and fetch conversations on mount
    useEffect(() => {
        if (!user?.id) return;

        // Connect WebSocket
        connectSocket(parseInt(user.id));

        // Fetch conversations from backend
        fetchConversations().catch(err => {
            console.error('Failed to load conversations:', err);
        });

        // Cleanup on unmount (but don't disconnect - we handle that on logout)
        return () => {
            // Leave any active conversation
            if (selectedConversationId) {
                leaveConversation(selectedConversationId);
            }
        };
    }, [user?.id]); // Only run once on mount

    // Setup WebSocket event listeners
    useEffect(() => {
        if (!user?.id) return;

        // Listen for new messages
        const cleanupNewMessage = onNewMessage(({ conversationId, message }) => {
            addMessage(conversationId, message);
        });

        // Listen for message edits
        const cleanupMessageEdited = onMessageEdited(({ conversationId, message }) => {
            updateMessage(conversationId, message.id, message);
        });

        // Listen for message deletions
        const cleanupMessageDeleted = onMessageDeleted(({ conversationId, messageId }) => {
            removeMessage(conversationId, messageId);
        });

        // Listen for typing indicators
        const cleanupUserTyping = onUserTyping(({ conversationId, username, userId }) => {
            addTypingUser(userId, username, conversationId);
        });

        const cleanupUserStopTyping = onUserStopTyping(({ conversationId, userId }) => {
            removeTypingUser(userId, conversationId);
        });

        // Listen for online/offline status
        const cleanupUserOnline = onUserOnline(({ userId }) => {
            setUserOnline(userId);
        });

        const cleanupUserOffline = onUserOffline(({ userId }) => {
            setUserOffline(userId);
        });

        // Cleanup all listeners on unmount
        return () => {
            cleanupNewMessage();
            cleanupMessageEdited();
            cleanupMessageDeleted();
            cleanupUserTyping();
            cleanupUserStopTyping();
            cleanupUserOnline();
            cleanupUserOffline();
        };
    }, [user?.id, addMessage, updateMessage, removeMessage, addTypingUser, removeTypingUser, setUserOnline, setUserOffline]);

    // Join/leave conversation rooms when selection changes
    useEffect(() => {
        if (!selectedConversationId) return;

        // Join the conversation room
        joinConversation(selectedConversationId);

        // Cleanup: leave room when switching conversations or unmounting
        return () => {
            leaveConversation(selectedConversationId);
        };
    }, [selectedConversationId]);

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
        // Set selected conversation in store
        setSelectedConversation(contact.conversationId);

        // Fetch messages from backend if not already loaded
        if (!allMessages[contact.conversationId]) {
            fetchMessages(contact.conversationId).catch(err => {
                console.error('Failed to load messages:', err);
            });
        }
    };

    // Handle sending a new message
    const handleSendMessage = async (content: string) => {
        if (!selectedContact || !selectedConversationId) return;

        try {
            // Send message via chat store (which calls API and updates state)
            await sendMessage(selectedConversationId, {
                content,
                messageType: 'text',
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            // TODO: Show error notification to user
        }
    };

    // Filter contacts based on search query
    const filteredContacts = conversations.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handle logout
    const handleLogout = () => {
        // Disconnect WebSocket
        disconnectSocket();
        // Clear chat data
        clearChatData();
        // Logout from auth store
        logout();
        navigate('/login');
    };

    // Handle typing indicator (emit to other users)
    const handleTyping = (conversationId: number, username: string) => {
        emitTyping(conversationId, username);
    };

    // Handle stop typing indicator
    const handleStopTyping = (conversationId: number) => {
        emitStopTyping(conversationId);
    };

    // Get typing users for current conversation
    const typingUsersInConversation = selectedConversationId
        ? getTypingUsers(selectedConversationId)
        : [];

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
                                    <AvatarImage src={getAvatarUrl(user?.avatarUrl)} alt={user?.username} />
                                    <AvatarFallback className="bg-orange-500/20 text-orange-500 text-xs font-semibold">
                                        {getUserInitials(user?.username)}
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

                                {/* Typing indicator */}
                                {typingUsersInConversation.length > 0 && (
                                    <div className="flex items-center gap-2 px-4 py-2 text-gray-400 text-sm">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                        <span>
                                            {typingUsersInConversation.length === 1
                                                ? `${typingUsersInConversation[0].username} is typing...`
                                                : `${typingUsersInConversation.length} people are typing...`}
                                        </span>
                                    </div>
                                )}

                                {/* Auto-scroll anchor */}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* Message input */}
                        <MessageInput
                            onSendMessage={handleSendMessage}
                            conversationId={selectedConversationId ?? undefined}
                            username={user?.username}
                            onTyping={handleTyping}
                            onStopTyping={handleStopTyping}
                        />
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
