
'use client';
import { useState, useMemo } from 'react';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';
import { User, Notification } from '@/lib/types';
import { db } from '@/lib/firebase';
import { ref, update } from 'firebase/database';
import { NotificationItem } from './notification-item';

interface NotificationBellProps {
    currentUser: User;
}

export function NotificationBell({ currentUser }: NotificationBellProps) {
    const notifications = useMemo(() => {
        if (!currentUser.notifications) return [];
        return Object.values(currentUser.notifications).sort((a, b) => b.timestamp - a.timestamp);
    }, [currentUser.notifications]);
    
    const hasUnread = useMemo(() => notifications.some(n => !n.isRead), [notifications]);

    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen && hasUnread) {
            // Mark all as read when dropdown is opened
            const updates: { [key: string]: any } = {};
            notifications.forEach(n => {
                if (!n.isRead) {
                    updates[`/users/${currentUser.id}/notifications/${n.id}/isRead`] = true;
                }
            });
            if (Object.keys(updates).length > 0) {
                update(ref(db), updates);
            }
        }
    };

    return (
        <DropdownMenu onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full bg-secondary hover:bg-muted">
                    <Bell className="h-5 w-5" />
                    {hasUnread && (
                        <span className="absolute top-1 right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-96">
                    <div className="p-2 space-y-1">
                        {notifications.length > 0 ? (
                            notifications.map(notification => (
                                <NotificationItem key={notification.id} notification={notification} />
                            ))
                        ) : (
                            <div className="text-center text-sm text-muted-foreground py-4">
                                You have no notifications.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
