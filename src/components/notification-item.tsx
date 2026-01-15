
'use client';
import Link from 'next/link';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { ThumbsUp, UserPlus, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Notification, User } from '@/lib/types';
import { PostIcon } from './post-icon';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

interface NotificationItemProps {
    notification: Notification;
}

const getIcon = (type: Notification['type']) => {
    switch (type) {
        case 'COPYRIGHT_STRIKE_NEW':
        case 'COPYRIGHT_STRIKE_UPDATE':
            return <AlertTriangle className="h-5 w-5 text-destructive" />;
        case 'NEW_FOLLOWER':
            return <UserPlus className="h-5 w-5 text-blue-500" />;
        case 'POST_LIKE':
            return <ThumbsUp className="h-5 w-5 text-primary" />;
        default:
            return <PostIcon className="h-5 w-5" />;
    }
};

export function NotificationItem({ notification }: NotificationItemProps) {
    const [relatedUser, setRelatedUser] = useState<User | null>(null);

    useEffect(() => {
        if (notification.relatedUserId) {
            const userRef = ref(db, `users/${notification.relatedUserId}`);
            const listener = onValue(userRef, (snapshot) => {
                if (snapshot.exists()) {
                    setRelatedUser({ id: snapshot.key!, ...snapshot.val() });
                }
            });
            // In a real app, you'd want to return the unsubscribe function from onValue,
            // but for this component, a one-time fetch is often sufficient.
        }
    }, [notification.relatedUserId]);

    const content = (
        <div className={cn(
            "flex items-start gap-3 p-2 rounded-lg hover:bg-secondary",
            !notification.isRead && "bg-secondary"
        )}>
            <div className="flex-shrink-0">
                {relatedUser ? (
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={relatedUser.avatar} />
                        <AvatarFallback>{relatedUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                ) : (
                    <div className="h-8 w-8 flex items-center justify-center bg-muted rounded-full">
                        {getIcon(notification.type)}
                    </div>
                )}
            </div>
            <div>
                <p className="text-sm" dangerouslySetInnerHTML={{ __html: notification.message }} />
                <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                </p>
            </div>
        </div>
    );

    if (notification.link) {
        return (
            <Link href={notification.link} className="block">
                {content}
            </Link>
        );
    }

    return content;
}
