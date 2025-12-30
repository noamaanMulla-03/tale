// ============================================================================
// CREATE GROUP DIALOG COMPONENT
// ============================================================================
// Modal dialog for creating a new group conversation
// Features:
// - Group name input (required)
// - Description textarea (optional)
// - Multi-select member picker from existing contacts
// - Group avatar upload (optional - future enhancement)
// - Validation and error handling
// ============================================================================

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, X, Check } from 'lucide-react';
import { Contact } from '@/types/chat';
import { createGroup } from '@/features/chat/services/chat';
import { getAvatarUrl, getUserInitials } from '@/lib/avatar';
import { cn, toastError, toastSuccess } from '@/lib/utils';

interface CreateGroupDialogProps {
    // Whether the dialog is open
    open: boolean;
    // Callback to close the dialog
    onClose: () => void;
    // List of contacts to choose from (exclude current user)
    availableContacts: Contact[];
    // Callback after successful group creation
    onGroupCreated: (conversationId: number) => void;
}

export function CreateGroupDialog({
    open,
    onClose,
    availableContacts,
    onGroupCreated,
}: CreateGroupDialogProps) {
    // Form state
    const [groupName, setGroupName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

    // UI state
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    /**
     * Toggle member selection
     * Add or remove member from selectedMembers array
     */
    const toggleMember = (userId: number) => {
        setSelectedMembers(prev => {
            if (prev.includes(userId)) {
                // Remove member
                return prev.filter(id => id !== userId);
            } else {
                // Add member
                return [...prev, userId];
            }
        });
    };

    /**
     * Check if member is selected
     */
    const isMemberSelected = (userId: number) => {
        return selectedMembers.includes(userId);
    };

    /**
     * Filter contacts based on search query
     */
    const filteredContacts = availableContacts.filter(contact => {
        // Only show direct message contacts (not groups)
        if (contact.conversationType === 'group') return false;

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return (
                contact.name.toLowerCase().includes(query) ||
                contact.username.toLowerCase().includes(query)
            );
        }
        return true;
    });

    /**
     * Get selected contact objects (for displaying badges)
     */
    const selectedContacts = availableContacts.filter(contact =>
        selectedMembers.includes(contact.id)
    );

    /**
     * Validate form before submission
     */
    const validateForm = (): string | null => {
        // Group name is required
        if (!groupName.trim()) {
            return 'Group name is required';
        }

        // At least 2 members required (including current user)
        if (selectedMembers.length < 1) {
            return 'Please select at least 1 member (you will be included automatically)';
        }

        return null;
    };

    /**
     * Handle form submission
     * Creates group via API and calls onGroupCreated callback
     */
    const handleCreateGroup = async () => {
        // Validate form
        const validationError = validateForm();
        if (validationError) {
            toastError(validationError);
            return;
        }

        setIsCreating(true);

        try {
            // Call API to create group
            const conversation = await createGroup({
                name: groupName.trim(),
                description: description.trim() || undefined,
                participantIds: selectedMembers,
                // avatarUrl: undefined, // TODO: Add avatar upload functionality
            });

            // Success! Close dialog and notify parent
            toastSuccess('Group created successfully!');
            handleClose();
            onGroupCreated(conversation.id);
        } catch (err: any) {
            console.error('Failed to create group:', err);
            toastError(err.response?.data?.error || 'Failed to create group. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    /**
     * Close dialog and reset form
     */
    const handleClose = () => {
        // Reset form state
        setGroupName('');
        setDescription('');
        setSelectedMembers([]);
        setSearchQuery('');

        // Call parent close handler
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                {/* Dialog Header */}
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-orange-500" />
                        Create New Group
                    </DialogTitle>
                    <DialogDescription>
                        Create a group to chat with multiple people at once
                    </DialogDescription>
                </DialogHeader>

                {/* Form Content */}
                <div className="space-y-4 py-4">
                    {/* Group Name Input */}
                    <div className="space-y-2">
                        <Label htmlFor="groupName" className="text-white">
                            Group Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="groupName"
                            placeholder="Enter group name"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50"
                            maxLength={100}
                        />
                    </div>

                    {/* Description Input */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-white">
                            Description (Optional)
                        </Label>
                        <Textarea
                            id="description"
                            placeholder="What's this group about?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50 resize-none"
                            rows={3}
                            maxLength={500}
                        />
                    </div>

                    {/* Selected Members Display */}
                    {selectedContacts.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-white">
                                Selected Members ({selectedContacts.length})
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {selectedContacts.map((contact) => (
                                    <Badge
                                        key={contact.id}
                                        variant="secondary"
                                        className="bg-orange-500/20 text-orange-500 hover:bg-orange-500/30 pr-1"
                                    >
                                        {contact.name}
                                        <button
                                            onClick={() => toggleMember(contact.id)}
                                            className="ml-1 hover:bg-orange-500/50 rounded-full p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Member Selection */}
                    <div className="space-y-2">
                        <Label className="text-white">
                            Add Members <span className="text-red-500">*</span>
                        </Label>

                        {/* Search input for filtering contacts */}
                        <Input
                            placeholder="Search contacts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50"
                        />

                        {/* Contact list with checkboxes */}
                        <ScrollArea className="h-[200px] rounded-md border border-white/10 bg-[#1a1a1a]">
                            <div className="p-2 space-y-1">
                                {filteredContacts.length > 0 ? (
                                    filteredContacts.map((contact) => {
                                        const isSelected = isMemberSelected(contact.id);

                                        return (
                                            <div
                                                key={contact.id}
                                                onClick={() => toggleMember(contact.id)}
                                                className={cn(
                                                    "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                                                    "hover:bg-white/5",
                                                    isSelected && "bg-orange-500/10"
                                                )}
                                            >
                                                {/* Checkbox indicator */}
                                                <div
                                                    className={cn(
                                                        "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                                        isSelected
                                                            ? "bg-orange-500 border-orange-500"
                                                            : "border-white/30"
                                                    )}
                                                >
                                                    {isSelected && <Check className="h-3 w-3 text-white" />}
                                                </div>

                                                {/* Contact avatar */}
                                                <Avatar className="h-8 w-8 border border-white/10">
                                                    <AvatarImage
                                                        src={getAvatarUrl(contact.avatar)}
                                                        alt={contact.name}
                                                    />
                                                    <AvatarFallback className="bg-orange-500/20 text-orange-500 text-xs">
                                                        {getUserInitials(contact.name)}
                                                    </AvatarFallback>
                                                </Avatar>

                                                {/* Contact name and username */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white font-medium truncate">
                                                        {contact.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        @{contact.username}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    // No contacts found message
                                    <div className="text-center py-8 text-gray-500">
                                        <p className="text-sm">
                                            {searchQuery
                                                ? 'No contacts found matching your search'
                                                : 'No contacts available'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                {/* Dialog Footer with action buttons */}
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={handleClose}
                        disabled={isCreating}
                        className="text-gray-400 hover:text-white hover:bg-white/10"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateGroup}
                        disabled={isCreating}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                        {isCreating ? (
                            <>
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Users className="h-4 w-4 mr-2" />
                                Create Group
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
