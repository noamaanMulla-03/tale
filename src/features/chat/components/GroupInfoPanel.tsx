// ============================================================================
// GROUP INFO PANEL COMPONENT
// ============================================================================
// Side panel for viewing and managing group details
// Features:
// - Group avatar, name, and description display
// - Participant list with avatars and admin badges
// - Add members button
// - Leave group button
// - Edit group details (admin only)
// ============================================================================

import { useState, useEffect } from 'react';
import { Contact, GroupParticipant } from '@/types/chat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Users,
    X,
    UserPlus,
    LogOut,
    Edit,
    Shield,
} from 'lucide-react';
import { getGroupMembers, removeGroupMember } from '@/features/chat/services/chat';
import { getAvatarUrl, getUserInitials } from '@/lib/avatar';
import useAuthStore from '@/store/useAuthStore';

interface GroupInfoPanelProps {
    // The group contact/conversation
    group: Contact;
    // Whether the panel is open
    isOpen: boolean;
    // Callback to close the panel
    onClose: () => void;
    // Optional: Callback to add members
    onAddMembers?: () => void;
    // Optional: Callback to edit group details
    onEditGroup?: () => void;
    // Optional: Callback after leaving group
    onLeaveGroup?: () => void;
}

export function GroupInfoPanel({
    group,
    isOpen,
    onClose,
    onAddMembers,
    onEditGroup,
    onLeaveGroup,
}: GroupInfoPanelProps) {
    // Get current user from auth store
    const { user } = useAuthStore();

    // State for group members
    const [members, setMembers] = useState<GroupParticipant[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [isLeavingGroup, setIsLeavingGroup] = useState(false);

    // Check if current user is admin
    const isAdmin = !!(user?.id && group.groupCreatorId === parseInt(user.id));

    /**
     * Fetch group members when panel opens
     */
    useEffect(() => {
        if (isOpen && group.conversationId) {
            fetchMembers();
        }
    }, [isOpen, group.conversationId]);

    /**
     * Fetch group members from API
     */
    const fetchMembers = async () => {
        setIsLoadingMembers(true);
        try {
            const participants = await getGroupMembers(group.conversationId);
            setMembers(participants);
        } catch (error) {
            console.error('Failed to fetch group members:', error);
        } finally {
            setIsLoadingMembers(false);
        }
    };

    /**
     * Handle leaving the group
     */
    const handleLeaveGroup = async () => {
        if (!user?.id) return;

        const confirmed = confirm('Are you sure you want to leave this group?');
        if (!confirmed) return;

        setIsLeavingGroup(true);
        try {
            await removeGroupMember(group.conversationId, parseInt(user.id));
            // Close panel and notify parent
            onClose();
            if (onLeaveGroup) {
                onLeaveGroup();
            }
        } catch (error) {
            console.error('Failed to leave group:', error);
            alert('Failed to leave group. Please try again.');
        } finally {
            setIsLeavingGroup(false);
        }
    };

    // Don't render if not open
    if (!isOpen) return null;

    return (
        <>
            {/* Overlay backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={onClose}
            />

            {/* Side panel */}
            <div
                className={`
                    fixed top-0 right-0 h-full w-full md:w-96 
                    bg-[#2a2a2a] border-l border-white/10 
                    transform transition-transform duration-300 z-50
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                `}
            >
                {/* Panel Header */}
                <div className="h-20 border-b border-white/10 px-6 flex items-center justify-between">
                    <h2 className="text-white font-semibold text-lg">Group Info</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white hover:bg-white/10"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Panel Content */}
                <ScrollArea className="h-[calc(100vh-5rem)]">
                    <div className="p-6 space-y-6">
                        {/* Group Avatar and Name Section */}
                        <div className="flex flex-col items-center text-center space-y-3">
                            {/* Group Avatar */}
                            <Avatar className="h-24 w-24 border-4 border-white/10">
                                <img
                                    src={getAvatarUrl(group.groupAvatar || '/default-group-avatar.png')}
                                    alt={group.groupName || 'Group'}
                                />
                                <AvatarFallback className="bg-orange-500/20 text-orange-500">
                                    <Users className="h-10 w-10" />
                                </AvatarFallback>
                            </Avatar>

                            {/* Group Name */}
                            <div>
                                <h3 className="text-white font-bold text-xl">
                                    {group.groupName || 'Unnamed Group'}
                                </h3>
                                <p className="text-gray-400 text-sm mt-1">
                                    {group.participantCount} {group.participantCount === 1 ? 'member' : 'members'}
                                </p>
                            </div>

                            {/* Edit Group Button (admin only) */}
                            {isAdmin && onEditGroup && (
                                <Button
                                    onClick={onEditGroup}
                                    variant="outline"
                                    size="sm"
                                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                                >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Group
                                </Button>
                            )}
                        </div>

                        {/* Group Description */}
                        {group.groupDescription && (
                            <>
                                <Separator className="bg-white/10" />
                                <div>
                                    <h4 className="text-gray-400 text-xs font-semibold uppercase mb-2">
                                        Description
                                    </h4>
                                    <p className="text-white text-sm leading-relaxed">
                                        {group.groupDescription}
                                    </p>
                                </div>
                            </>
                        )}

                        <Separator className="bg-white/10" />

                        {/* Members Section */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-gray-400 text-xs font-semibold uppercase">
                                    Members ({members.length})
                                </h4>
                                {/* Add Members Button */}
                                {onAddMembers && (
                                    <Button
                                        onClick={onAddMembers}
                                        variant="ghost"
                                        size="sm"
                                        className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10 h-8"
                                    >
                                        <UserPlus className="h-4 w-4 mr-1" />
                                        Add
                                    </Button>
                                )}
                            </div>

                            {/* Members List */}
                            {isLoadingMembers ? (
                                // Loading state
                                <div className="text-center py-8 text-gray-500">
                                    <div className="animate-spin h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2" />
                                    <p className="text-sm">Loading members...</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {members.map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                                        >
                                            {/* Member Avatar */}
                                            <Avatar className="h-10 w-10 border border-white/10">
                                                <img
                                                    src={getAvatarUrl(member.avatarUrl)}
                                                    alt={member.displayName}
                                                />
                                                <AvatarFallback className="bg-orange-500/20 text-orange-500 text-xs">
                                                    {getUserInitials(member.displayName)}
                                                </AvatarFallback>
                                            </Avatar>

                                            {/* Member Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-white text-sm font-medium truncate">
                                                        {member.displayName}
                                                    </p>
                                                    {/* Admin Badge */}
                                                    {member.isAdmin && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="bg-orange-500/20 text-orange-500 text-xs px-1.5 py-0"
                                                        >
                                                            <Shield className="h-3 w-3 mr-1" />
                                                            Admin
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-gray-500 text-xs">
                                                    @{member.username}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Separator className="bg-white/10" />

                        {/* Action Buttons */}
                        <div className="space-y-2">
                            {/* Leave Group Button */}
                            <Button
                                onClick={handleLeaveGroup}
                                disabled={isLeavingGroup || isAdmin}
                                variant="outline"
                                className="w-full bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20 hover:border-red-500/30"
                            >
                                {isLeavingGroup ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full mr-2" />
                                        Leaving...
                                    </>
                                ) : (
                                    <>
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Leave Group
                                    </>
                                )}
                            </Button>

                            {/* Info message for admins */}
                            {isAdmin && (
                                <p className="text-xs text-gray-500 text-center">
                                    As the group admin, you cannot leave the group.
                                    Transfer admin rights or delete the group instead.
                                </p>
                            )}
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </>
    );
}
