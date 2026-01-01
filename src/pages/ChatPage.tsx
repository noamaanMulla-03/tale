// Main Chat Page Component
// Implements the complete chat interface with contacts sidebar and chat area
// Fully integrated with backend API and WebSocket for real-time features

import { useState, useRef, useEffect } from 'react';
import { Contact, Message } from '@/types/chat';
import { ContactItem } from '@/features/chat/components/ContactItem';
import { ChatHeader } from '@/features/chat/components/ChatHeader';
import { MessageBubble } from '@/features/chat/components/MessageBubble';
import { MessageInput } from '@/features/chat/components/MessageInput';
import { CreateGroupDialog } from '@/features/chat/components/CreateGroupDialog';
import { GroupInfoPanel } from '@/features/chat/components/GroupInfoPanel';
import { VideoCallWindow } from '@/features/chat/components/VideoCallWindow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, LogOut, Settings, User, UserPlus, X, Users as UsersIcon, Edit3 } from 'lucide-react';
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
import {
    initializeWebRTC,
    startCall,
    onIncomingCall,
    onStateChange as onCallStateChange,
    checkWebRTCSupport,
    type CallInfo,
} from '@/lib/webrtc';
import { toast } from 'sonner';
import { searchUsers, UserSearchResult } from '@/features/auth/services/user';
import { createOrGetConversation, MessageResponse } from '@/features/chat/services/chat';

/**
 * Helper function to convert MessageResponse (from backend/WebSocket) to Message type
 * This ensures incoming WebSocket messages have the correct structure
 * Includes runtime validation to catch production issues
 */
const convertMessageResponseToMessage = (msg: MessageResponse): Message => {
    // Validate that we have the essential fields
    if (!msg || typeof msg !== 'object') {
        console.error('[ChatPage] Invalid message received:', msg);
        throw new Error('Invalid message object received from WebSocket');
    }

    // Ensure created_at exists and is valid
    if (!msg.created_at) {
        console.error('[ChatPage] Message missing created_at timestamp:', msg);
        // Use current timestamp as fallback
        msg.created_at = new Date().toISOString();
    }

    return {
        id: msg.id,
        senderId: msg.sender_id,
        senderName: msg.sender_display_name || 'Unknown User',
        senderAvatar: msg.sender_avatar_url || '/default-avatar.png',
        content: msg.content || '',
        timestamp: msg.created_at, // Convert created_at to timestamp
        read: true, // Assume read if we're viewing it
        type: msg.message_type || 'text',
        fileUrl: msg.file_url,
        fileName: msg.file_name,
        isEdited: msg.is_edited || false,
    };
};

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
        currentCall,
        setCurrentCall,
    } = useChatStore();

    // Local state for search query (filters existing conversations)
    const [searchQuery, setSearchQuery] = useState('');

    // State for user search functionality (finding new users to chat with)
    const [isSearchingUsers, setIsSearchingUsers] = useState(false); // Toggle between conversation search and user search
    const [userSearchQuery, setUserSearchQuery] = useState(''); // User search input
    const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]); // Search results
    const [isLoadingSearch, setIsLoadingSearch] = useState(false); // Loading state for search
    const [searchError, setSearchError] = useState<string | null>(null); // Error message for search

    // State for group creation dialog
    const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);

    // State for group info panel
    const [isGroupInfoPanelOpen, setIsGroupInfoPanelOpen] = useState(false);

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

        // ====================================================================
        // INITIALIZE WEBRTC
        // ====================================================================
        initializeWebRTC();

        // ====================================================================
        // MESSAGE EVENT LISTENERS
        // ====================================================================

        // Listen for new messages
        // Convert MessageResponse from backend to Message type before adding to store
        const cleanupNewMessage = onNewMessage(({ conversationId, message }) => {
            // Log incoming message for debugging production issues
            console.log('[ChatPage] Received new_message event:', { conversationId, message });

            try {
                const convertedMessage = convertMessageResponseToMessage(message);
                console.log('[ChatPage] Converted message:', convertedMessage);
                addMessage(conversationId, convertedMessage);
            } catch (error) {
                console.error('[ChatPage] Error converting/adding message:', error);
                // Show error notification to user
                toast.error('Failed to receive message. Please refresh the page.');
            }
        });

        // Listen for message edits
        // Convert MessageResponse from backend to Message type before updating store
        const cleanupMessageEdited = onMessageEdited(({ conversationId, message }) => {
            console.log('[ChatPage] Received message_edited event:', { conversationId, message });

            try {
                const convertedMessage = convertMessageResponseToMessage(message);
                updateMessage(conversationId, convertedMessage.id, convertedMessage);
            } catch (error) {
                console.error('[ChatPage] Error converting/updating edited message:', error);
            }
        });

        // Listen for message deletions
        const cleanupMessageDeleted = onMessageDeleted(({ conversationId, messageId }) => {
            removeMessage(conversationId, messageId);
        });

        // ====================================================================
        // TYPING INDICATORS
        // ====================================================================

        // Listen for typing indicators
        const cleanupUserTyping = onUserTyping(({ conversationId, username, userId }) => {
            addTypingUser(userId, username, conversationId);
        });

        const cleanupUserStopTyping = onUserStopTyping(({ conversationId, userId }) => {
            removeTypingUser(userId, conversationId);
        });

        // ====================================================================
        // ONLINE STATUS
        // ====================================================================

        // Listen for online/offline status
        const cleanupUserOnline = onUserOnline(({ userId }) => {
            setUserOnline(userId);
        });

        const cleanupUserOffline = onUserOffline(({ userId }) => {
            setUserOffline(userId);
        });

        // ====================================================================
        // VIDEO CALL LISTENERS
        // ====================================================================

        // Listen for incoming calls
        const cleanupIncomingCall = onIncomingCall((callInfo: CallInfo) => {
            console.log('[ChatPage] Incoming call from:', callInfo);

            // Find conversation to get user details
            const conversation = conversations.find(
                conv => conv.conversationId === callInfo.conversationId
            );

            if (conversation) {
                // Update call info with proper user details
                const updatedCallInfo: CallInfo = {
                    ...callInfo,
                    remoteUserName: conversation.name,
                    remoteUserAvatar: conversation.avatar,
                };
                setCurrentCall(updatedCallInfo);
            } else {
                setCurrentCall(callInfo);
            }
        });

        // Listen for call state changes
        const cleanupCallStateChange = onCallStateChange((state) => {
            console.log('[ChatPage] Call state changed:', state);

            // Clear call when ended
            if (state === 'ended' && currentCall) {
                setCurrentCall(null);
            }
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
            cleanupIncomingCall();
            cleanupCallStateChange();
        };
    }, [user?.id, conversations, currentCall, addMessage, updateMessage, removeMessage, addTypingUser, removeTypingUser, setUserOnline, setUserOffline, setCurrentCall]);

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
    // ========================================================================
    // USER SEARCH HANDLERS
    // ========================================================================

    /**
     * Toggle between conversation search and new user search modes
     * When entering user search mode, clear previous search results
     */
    const handleToggleUserSearch = () => {
        setIsSearchingUsers(!isSearchingUsers);
        // Clear search states when toggling
        if (!isSearchingUsers) {
            setUserSearchQuery('');
            setUserSearchResults([]);
            setSearchError(null);
        }
    };

    /**
     * Perform user search with debouncing
     * Searches for users by username or display name
     * Minimum 2 characters required
     */
    const handleUserSearch = async (query: string) => {
        setUserSearchQuery(query);
        setSearchError(null);

        // Clear results if query is too short
        if (query.trim().length < 2) {
            setUserSearchResults([]);
            return;
        }

        // Set loading state
        setIsLoadingSearch(true);

        try {
            // Call API to search users
            const response = await searchUsers(query);
            setUserSearchResults(response.users);

            // Show message if no results found
            if (response.users.length === 0) {
                setSearchError('No users found matching your search');
            }
        } catch (error) {
            console.error('User search failed:', error);
            setSearchError('Failed to search users. Please try again.');
            setUserSearchResults([]);
        } finally {
            setIsLoadingSearch(false);
        }
    };

    /**
     * Start a new conversation with a selected user from search results
     * Creates or retrieves existing conversation, then switches to it
     */
    const handleStartConversation = async (user: UserSearchResult) => {
        try {
            // Show loading state (could add a spinner on the user card)
            setIsLoadingSearch(true);

            // Call API to create or get existing conversation
            const conversation = await createOrGetConversation(user.id);

            // Refresh conversations list to include the new/existing conversation
            await fetchConversations();

            // Switch to the conversation using the ID from the API response
            setSelectedConversation(conversation.id);

            // Fetch messages for this conversation
            await fetchMessages(conversation.id);

            // Exit search mode and clear search
            setIsSearchingUsers(false);
            setUserSearchQuery('');
            setUserSearchResults([]);
        } catch (error) {
            console.error('Failed to start conversation:', error);
            setSearchError('Failed to start conversation. Please try again.');
        } finally {
            setIsLoadingSearch(false);
        }
    };

    /**
     * Handle successful group creation
     * Refreshes conversations list and selects the newly created group
     */
    const handleGroupCreated = async (groupId: number) => {
        try {
            // Close the create group dialog
            setIsCreateGroupDialogOpen(false);

            // Refresh conversations to include the new group
            await fetchConversations();

            // Select the newly created group
            setSelectedConversation(groupId);

            // Fetch messages for the new group (will be empty initially)
            await fetchMessages(groupId);
        } catch (error) {
            console.error('Failed to handle group creation:', error);
        }
    };

    /**
     * Toggle the group info panel visibility
     */
    const handleOpenGroupInfo = () => {
        setIsGroupInfoPanelOpen(true);
    };

    /**
     * Start a video call with the selected contact
     */
    const handleStartCall = async () => {
        if (!selectedContact) return;

        // Check if WebRTC is supported
        if (!checkWebRTCSupport()) {
            toast.error(
                'Video Calling Not Supported',
                {
                    description: 'Video calling requires a modern web browser with WebRTC support. ' +
                        'If you\'re using a desktop app, please try opening the app in a web browser.'
                }
            );
            return;
        }

        try {
            console.log('[ChatPage] Starting call with:', selectedContact.name);

            // Create call info
            const callInfo: CallInfo = {
                conversationId: selectedContact.conversationId,
                remoteUserId: selectedContact.id,
                remoteUserName: selectedContact.name,
                remoteUserAvatar: selectedContact.avatar,
                direction: 'outgoing',
                state: 'calling'
            };

            // Set in store (this will show VideoCallWindow)
            setCurrentCall(callInfo);

            // Start the WebRTC call
            await startCall(
                selectedContact.conversationId,
                selectedContact.id,
                selectedContact.name,
                selectedContact.avatar
            );
        } catch (error: any) {
            console.error('[ChatPage] Failed to start call:', error);

            // Clear call from store
            setCurrentCall(null);

            // Show error to user
            toast.error(
                'Failed to Start Call',
                {
                    description: error.message || 'Could not start the video call. Please try again.'
                }
            );
        }
    };

    /**
     * Handle closing the video call window
     */
    const handleCloseCall = () => {
        setCurrentCall(null);
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

                {/* Search and compose */}
                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                type="text"
                                placeholder={isSearchingUsers ? "Search users..." : "Search..."}
                                value={isSearchingUsers ? userSearchQuery : searchQuery}
                                onChange={(e) => {
                                    if (isSearchingUsers) {
                                        handleUserSearch(e.target.value);
                                    } else {
                                        setSearchQuery(e.target.value);
                                    }
                                }}
                                className="h-10 pl-9 pr-3 bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50 transition-all"
                            />
                        </div>

                        {/* Compose Menu */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    className="h-10 w-10 p-0 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30 transition-all duration-200 hover:scale-105 border-0"
                                    title="New conversation"
                                >
                                    <Edit3 className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="w-48 bg-[#2a2a2a] border-white/20 text-white"
                            >
                                <DropdownMenuItem
                                    onClick={handleToggleUserSearch}
                                    className="focus:bg-white/10 focus:text-white cursor-pointer py-2.5"
                                >
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    <span>New Chat</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setIsCreateGroupDialogOpen(true)}
                                    className="focus:bg-white/10 focus:text-white cursor-pointer py-2.5"
                                >
                                    <UsersIcon className="mr-2 h-4 w-4" />
                                    <span>Create Group</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Cancel search button */}
                        {isSearchingUsers && (
                            <Button
                                onClick={handleToggleUserSearch}
                                variant="ghost"
                                className="h-10 w-10 p-0 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                                title="Cancel search"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    {/* Active search indicator */}
                    {isSearchingUsers && (
                        <div className="flex items-center justify-between text-xs text-gray-400 px-1 mt-3">
                            <span className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                Searching for users
                            </span>
                        </div>
                    )}


                    {/* Search hints */}
                    {isSearchingUsers && (
                        <p className="text-xs text-gray-500 mt-2">
                            Search by username or display name (min 2 characters)
                        </p>
                    )}
                </div>

                {/* Contacts/Search Results list */}
                <ScrollArea className="flex-1">
                    <div className="space-y-0">
                        {isSearchingUsers ? (
                            // USER SEARCH MODE - Show search results
                            <>
                                {isLoadingSearch ? (
                                    // Loading state
                                    <div className="p-8 text-center text-gray-500">
                                        <div className="animate-spin h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2" />
                                        <p className="text-sm">Searching users...</p>
                                    </div>
                                ) : searchError ? (
                                    // Error state
                                    <div className="p-8 text-center text-gray-500">
                                        <p className="text-sm">{searchError}</p>
                                    </div>
                                ) : userSearchResults.length > 0 ? (
                                    // Search results
                                    userSearchResults.map((user) => (
                                        <div
                                            key={user.id}
                                            onClick={() => handleStartConversation(user)}
                                            className="flex items-center gap-3 p-4 cursor-pointer transition-all duration-200 border-l-2 border-l-transparent hover:bg-white/5 hover:border-l-orange-500 border-b border-white/5"
                                        >
                                            {/* User avatar */}
                                            <Avatar className="h-12 w-12 border-2 border-white/10">
                                                <AvatarImage src={getAvatarUrl(user.avatarUrl)} alt={user.username} />
                                                <AvatarFallback className="bg-orange-500/20 text-orange-500 font-semibold">
                                                    {getUserInitials(user.username)}
                                                </AvatarFallback>
                                            </Avatar>

                                            {/* User info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-white font-semibold text-sm truncate">
                                                    {user.displayName}
                                                </h3>
                                                <p className="text-gray-500 text-xs truncate">
                                                    @{user.username}
                                                </p>
                                            </div>

                                            {/* Start chat indicator */}
                                            <div className="text-orange-500">
                                                <UserPlus className="h-5 w-5" />
                                            </div>
                                        </div>
                                    ))
                                ) : userSearchQuery.length >= 2 ? (
                                    // No results found (after valid search)
                                    <div className="p-8 text-center text-gray-500">
                                        <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No users found</p>
                                        <p className="text-xs mt-1">Try a different search term</p>
                                    </div>
                                ) : (
                                    // Initial state - waiting for input
                                    <div className="p-8 text-center text-gray-500">
                                        <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Search for users to start chatting</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            // CONVERSATION MODE - Show existing conversations
                            <>
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
                                    // No conversations found
                                    <div className="p-8 text-center text-gray-500">
                                        <p className="text-sm">No conversations found</p>
                                        {searchQuery && (
                                            <p className="text-xs mt-1">Try a different search term</p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Right Side - Chat Area */}
            <div className="flex-1 flex flex-col">
                {selectedContact ? (
                    <>
                        {/* Chat header with contact info */}
                        <ChatHeader
                            contact={selectedContact}
                            onOpenGroupInfo={handleOpenGroupInfo}
                            onStartCall={handleStartCall}
                        />

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
                                            isGroupChat={selectedContact?.conversationType === 'group'}
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

            {/* Create Group Dialog */}
            <CreateGroupDialog
                open={isCreateGroupDialogOpen}
                onClose={() => setIsCreateGroupDialogOpen(false)}
                availableContacts={conversations.filter((c: Contact) => c.conversationType === 'direct')}
                onGroupCreated={handleGroupCreated}
            />

            {/* Group Info Panel */}
            {selectedContact?.conversationType === 'group' && (
                <GroupInfoPanel
                    group={selectedContact}
                    isOpen={isGroupInfoPanelOpen}
                    onClose={() => setIsGroupInfoPanelOpen(false)}
                    onLeaveGroup={async () => {
                        setIsGroupInfoPanelOpen(false);
                        setSelectedConversation(null);
                        await fetchConversations();
                    }}
                />
            )}

            {/* Video Call Window */}
            {currentCall && (
                <VideoCallWindow
                    callInfo={currentCall}
                    onClose={handleCloseCall}
                />
            )}
        </div>
    );
}

export default ChatPage;
