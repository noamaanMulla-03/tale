// Static mock data for chat functionality
import { Contact, Message } from '@/types/chat';

// Mock contacts/conversations list
export const mockContacts: Contact[] = [
    {
        id: '1',
        name: 'Sarah Mitchell',
        username: '@sarahmitchell',
        avatar: 'https://i.pravatar.cc/150?img=1',
        lastMessage: 'Hey! How are you doing today?',
        lastMessageTime: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        unreadCount: 2,
        isOnline: true,
        status: 'online'
    },
    {
        id: '2',
        name: 'Alex Rodriguez',
        username: '@alexrod',
        avatar: 'https://i.pravatar.cc/150?img=12',
        lastMessage: 'Thanks for the help!',
        lastMessageTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        unreadCount: 0,
        isOnline: true,
        status: 'online'
    },
    {
        id: '3',
        name: 'Emma Watson',
        username: '@emmawatson',
        avatar: 'https://i.pravatar.cc/150?img=5',
        lastMessage: 'See you tomorrow!',
        lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        unreadCount: 0,
        isOnline: false,
        status: 'away'
    },
    {
        id: '4',
        name: 'James Chen',
        username: '@jameschen',
        avatar: 'https://i.pravatar.cc/150?img=13',
        lastMessage: 'Can we schedule a meeting?',
        lastMessageTime: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        unreadCount: 1,
        isOnline: false,
        status: 'offline'
    },
    {
        id: '5',
        name: 'Olivia Brown',
        username: '@oliviabrown',
        avatar: 'https://i.pravatar.cc/150?img=9',
        lastMessage: 'Got it, will do!',
        lastMessageTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        unreadCount: 0,
        isOnline: true,
        status: 'busy'
    },
    {
        id: '6',
        name: 'Michael Scott',
        username: '@michaelscott',
        avatar: 'https://i.pravatar.cc/150?img=14',
        lastMessage: 'That\'s what she said!',
        lastMessageTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        unreadCount: 0,
        isOnline: false,
        status: 'offline'
    },
];

// Mock messages for a conversation
// Key is the contact ID, value is array of messages
export const mockMessages: Record<string, Message[]> = {
    '1': [
        {
            id: 'm1',
            senderId: '1',
            senderName: 'Sarah Mitchell',
            senderAvatar: 'https://i.pravatar.cc/150?img=1',
            content: 'Hi there! How have you been?',
            timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
            isRead: true,
            isSent: false
        },
        {
            id: 'm2',
            senderId: 'me',
            senderName: 'You',
            content: 'Hey Sarah! I\'ve been great, thanks for asking. How about you?',
            timestamp: new Date(Date.now() - 55 * 60 * 1000), // 55 minutes ago
            isRead: true,
            isSent: true
        },
        {
            id: 'm3',
            senderId: '1',
            senderName: 'Sarah Mitchell',
            senderAvatar: 'https://i.pravatar.cc/150?img=1',
            content: 'I\'m doing well! Just finished a big project at work.',
            timestamp: new Date(Date.now() - 50 * 60 * 1000), // 50 minutes ago
            isRead: true,
            isSent: false
        },
        {
            id: 'm4',
            senderId: '1',
            senderName: 'Sarah Mitchell',
            senderAvatar: 'https://i.pravatar.cc/150?img=1',
            content: 'It was quite challenging but really rewarding in the end.',
            timestamp: new Date(Date.now() - 50 * 60 * 1000), // 50 minutes ago
            isRead: true,
            isSent: false
        },
        {
            id: 'm5',
            senderId: 'me',
            senderName: 'You',
            content: 'That\'s awesome! Congratulations on completing it!',
            timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
            isRead: true,
            isSent: true
        },
        {
            id: 'm6',
            senderId: 'me',
            senderName: 'You',
            content: 'What kind of project was it?',
            timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
            isRead: true,
            isSent: true
        },
        {
            id: 'm7',
            senderId: '1',
            senderName: 'Sarah Mitchell',
            senderAvatar: 'https://i.pravatar.cc/150?img=1',
            content: 'It was a complete redesign of our company\'s main website. We had to rebuild everything from scratch!',
            timestamp: new Date(Date.now() - 40 * 60 * 1000), // 40 minutes ago
            isRead: true,
            isSent: false
        },
        {
            id: 'm8',
            senderId: 'me',
            senderName: 'You',
            content: 'Wow, that sounds like a massive undertaking! How long did it take?',
            timestamp: new Date(Date.now() - 35 * 60 * 1000), // 35 minutes ago
            isRead: true,
            isSent: true
        },
        {
            id: 'm9',
            senderId: '1',
            senderName: 'Sarah Mitchell',
            senderAvatar: 'https://i.pravatar.cc/150?img=1',
            content: 'About 3 months from start to finish. Long days but totally worth it!',
            timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
            isRead: true,
            isSent: false
        },
        {
            id: 'm10',
            senderId: '1',
            senderName: 'Sarah Mitchell',
            senderAvatar: 'https://i.pravatar.cc/150?img=1',
            content: 'Hey! How are you doing today?',
            timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
            isRead: false,
            isSent: false
        }
    ],
    '2': [
        {
            id: 'm1',
            senderId: 'me',
            senderName: 'You',
            content: 'Hey Alex! I found that article you were looking for.',
            timestamp: new Date(Date.now() - 120 * 60 * 1000), // 2 hours ago
            isRead: true,
            isSent: true
        },
        {
            id: 'm2',
            senderId: '2',
            senderName: 'Alex Rodriguez',
            senderAvatar: 'https://i.pravatar.cc/150?img=12',
            content: 'Thanks for the help!',
            timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
            isRead: true,
            isSent: false
        }
    ],
    '3': [
        {
            id: 'm1',
            senderId: '3',
            senderName: 'Emma Watson',
            senderAvatar: 'https://i.pravatar.cc/150?img=5',
            content: 'See you tomorrow!',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            isRead: true,
            isSent: false
        }
    ]
};
