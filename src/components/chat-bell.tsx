
'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { User, Chat, Message } from '@/lib/types';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

interface ChatBellProps {
    currentUser: User;
}

export function ChatBell({ currentUser }: ChatBellProps) {
    const [chats, setChats] = useState<Chat>({});

    useEffect(() => {
        const chatsRef = ref(db, 'messages');
        const listener = onValue(chatsRef, (snapshot) => {
            if (snapshot.exists()) {
                setChats(snapshot.val());
            }
        });

        return () => listener();
    }, []);

    const hasUnread = useMemo(() => {
        if (!currentUser || !chats) return false;
        
        return Object.keys(chats).some(chatId => {
            if (!chatId.includes(currentUser.id)) return false;

            const chat = chats[chatId];
            if (!chat.messages) return false;

            return Object.values(chat.messages).some(message => {
                // It's unread if the message is not from me and I haven't read it
                return message.senderId !== currentUser.id && (!message.readBy || !message.readBy[currentUser.id]);
            });
        });
    }, [currentUser, chats]);

    return (
        <Link href="/friends">
            <Button variant="ghost" size="icon" className="relative rounded-full bg-secondary hover:bg-muted">
                <MessageSquare className="h-5 w-5" />
                 {hasUnread && (
                    <span className="absolute top-1 right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
            </Button>
        </Link>
    );
}
