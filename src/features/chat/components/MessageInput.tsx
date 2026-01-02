// Message Input Component
// Text input area for composing and sending messages with typing indicators

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Smile, Paperclip, Mic } from 'lucide-react';
import { cn, toastError } from '@/lib/utils';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { FileAttachmentDialog } from './FileAttachmentDialog';
import { sendFileMessage } from '../services/chatApi';

interface MessageInputProps {
    onSendMessage: (message: string) => void;
    placeholder?: string;
    conversationId?: number;
    username?: string;
    onTyping?: (conversationId: number, username: string) => void;
    onStopTyping?: (conversationId: number) => void;
}

export function MessageInput({
    onSendMessage,
    placeholder = "Type a message...",
    conversationId,
    username,
    onTyping,
    onStopTyping
}: MessageInputProps) {
    // State for the message text
    const [message, setMessage] = useState('');
    // State for typing indicator
    const [isTyping, setIsTyping] = useState(false);
    // State for emoji picker visibility
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    // State for file attachment dialog
    const [showFileDialog, setShowFileDialog] = useState(false);
    // Timer ref for typing indicator
    const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
    // Ref for emoji picker container (for click outside detection)
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    // Ref for textarea to restore focus after emoji selection
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Handle send message
    const handleSend = () => {
        // Don't send empty messages
        if (message.trim()) {
            onSendMessage(message.trim());
            // Clear the input after sending
            setMessage('');
            // Stop typing indicator
            if (isTyping && conversationId && onStopTyping) {
                setIsTyping(false);
                onStopTyping(conversationId);
            }
        }
    };

    // Handle Enter key press to send message
    const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Send on Enter, but allow Shift+Enter for new line
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value);

        // Trigger typing indicator
        if (conversationId && username && onTyping && onStopTyping) {
            if (!isTyping && e.target.value) {
                // User started typing
                setIsTyping(true);
                onTyping(conversationId, username);
            }

            // Clear existing timer
            if (typingTimerRef.current) {
                clearTimeout(typingTimerRef.current);
            }

            // Set new timer to stop typing after 3 seconds of inactivity
            if (e.target.value) {
                typingTimerRef.current = setTimeout(() => {
                    setIsTyping(false);
                    onStopTyping(conversationId);
                }, 3000);
            } else {
                // If input is empty, stop typing immediately
                if (isTyping) {
                    setIsTyping(false);
                    onStopTyping(conversationId);
                }
            }
        }
    };

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (typingTimerRef.current) {
                clearTimeout(typingTimerRef.current);
            }
        };
    }, []);

    // Handle click outside emoji picker to close it
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        }

        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [showEmojiPicker]);

    // Handle emoji selection
    const handleEmojiClick = (emojiData: EmojiClickData) => {
        // Insert emoji at cursor position or end of text
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newMessage = message.substring(0, start) + emojiData.emoji + message.substring(end);
            setMessage(newMessage);

            // Restore focus and cursor position after emoji
            setTimeout(() => {
                textarea.focus();
                const newCursorPos = start + emojiData.emoji.length;
                textarea.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
        } else {
            // Fallback: append emoji to end
            setMessage(prev => prev + emojiData.emoji);
        }

        // Keep picker open for multiple emoji selections
        // User can click outside or on emoji button again to close
    };

    // Toggle emoji picker
    const toggleEmojiPicker = () => {
        setShowEmojiPicker(prev => !prev);
    };

    // Handle file attachment
    const handleSendFile = async (file: File, caption?: string) => {
        if (!conversationId) {
            toastError('Error', 'No conversation selected');
            return;
        }

        try {
            // Send file message (uploads file and sends message)
            await sendFileMessage(conversationId, file, caption);

            // Note: The message will appear via WebSocket 'newMessage' event
            // No need to manually update UI here
        } catch (error) {
            console.error('Failed to send file:', error);
            toastError('Failed to send file', error instanceof Error ? error.message : 'Unknown error');
            throw error; // Re-throw to let FileAttachmentDialog handle it
        }
    };

    return (
        <div className="p-3 md:p-4 border-t border-white/10 bg-[#2a2a2a]/95 backdrop-blur-xl relative">
            {/* File Attachment Dialog */}
            <FileAttachmentDialog
                open={showFileDialog}
                onClose={() => setShowFileDialog(false)}
                onSendFile={handleSendFile}
            />

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
                <div
                    ref={emojiPickerRef}
                    className="absolute bottom-full left-4 mb-2 z-50 shadow-2xl"
                >
                    <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        theme={Theme.DARK}
                        width={350}
                        height={400}
                        searchPlaceHolder="Search emoji..."
                        previewConfig={{ showPreview: false }}
                    />
                </div>
            )}

            <div className="flex items-end gap-2 md:gap-3">
                {/* Additional action buttons - Hidden on mobile */}
                <div className="hidden sm:flex gap-1 pb-2">
                    {/* Emoji picker button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleEmojiPicker}
                        className={cn(
                            "text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 md:h-9 md:w-9",
                            showEmojiPicker && "bg-white/10 text-white"
                        )}
                        title="Add emoji"
                    >
                        <Smile className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>

                    {/* File attachment button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowFileDialog(true)}
                        className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 md:h-9 md:w-9"
                        title="Attach file"
                    >
                        <Paperclip className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                </div>

                {/* Message text input */}
                <div className="flex-1 relative">
                    <Textarea
                        ref={textareaRef}
                        value={message}
                        onChange={handleChange}
                        onKeyPress={handleKeyPress}
                        placeholder={placeholder}
                        className={cn(
                            "min-h-[40px] md:min-h-[44px] max-h-[100px] md:max-h-[120px] resize-none",
                            "bg-[#1a1a1a]/50 border-white/10 text-white text-sm md:text-base placeholder:text-gray-500",
                            "focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50",
                            "rounded-xl px-3 py-2 md:px-4 md:py-3",
                            // Hide scrollbar for cleaner look
                            "scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                        )}
                        rows={1}
                    />
                </div>

                {/* Send button or voice message button */}
                {message.trim() ? (
                    // Show send button when there's text
                    <Button
                        onClick={handleSend}
                        className={cn(
                            "h-10 w-10 md:h-11 md:w-11 rounded-full",
                            "bg-gradient-to-br from-orange-500 to-orange-600",
                            "hover:from-orange-600 hover:to-orange-700",
                            "text-white shadow-lg shadow-orange-500/20",
                            "transition-all duration-200 hover:shadow-orange-500/40",
                            "shrink-0"
                        )}
                        title="Send message"
                    >
                        <Send className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                ) : (
                    // Show voice message button when input is empty
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-white hover:bg-white/10 h-10 w-10 md:h-11 md:w-11 shrink-0"
                        title="Record voice message"
                    >
                        <Mic className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                )}
            </div>

            {/* Hint text - Hidden on mobile */}
            <p className="text-xs text-gray-600 mt-2 text-center hidden sm:block">
                Press Enter to send, Shift + Enter for new line
            </p>
        </div>
    );
}
