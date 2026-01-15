

'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, off, push, set, update } from "firebase/database";
import type { User, Message } from '@/lib/types';
import { Header } from '@/components/header';
import { LeftSidebar } from '@/components/left-sidebar';
import { RightSidebar } from '@/components/right-sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, MoreHorizontal, Trash2, ShieldX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

function MessageOptionsMenu({ message, currentUser, chatId }: { message: Message; currentUser: User; chatId: string }) {
    const { toast } = useToast();

    const handleDelete = (scope: 'me' | 'everyone') => {
        const messageRef = ref(db, `messages/${chatId}/${message.id}`);

        if (scope === 'me') {
            const updates: { [key: string]: any } = {};
            updates[`deletedFor/${currentUser.id}`] = true;
            update(messageRef, updates);
        } else { // 'everyone'
            // For "delete for everyone", we can just remove the message.
            set(messageRef, null);
        }
    };
    
    // Only show menu for messages sent by the current user
    if (message.senderId !== currentUser.id) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleDelete('me')}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete for me
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete('everyone')} className="text-destructive">
                    <ShieldX className="mr-2 h-4 w-4" />
                    Delete for everyone
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}


export default function MessagesPage({ params }: { params: { chatId: string } }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [otherUser, setOtherUser] = useState<User | null>(null);
    const [isClient, setIsClient] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const { chatId } = params;
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsClient(true);
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            const userRef = ref(db, `users/${user.id}`);
            onValue(userRef, (snapshot) => {
                const userData = snapshot.val();
                if (userData) {
                    setCurrentUser({ id: user.id, ...userData });
                }
            });
        } else {
            router.push('/');
        }
    }, [router]);

    useEffect(() => {
        if (!currentUser || !chatId) return;

        const userIds = chatId.split('_');
        const otherUserId = userIds.find(id => id !== currentUser.id);

        if (!otherUserId) return;

        // Fetch other user's data
        const otherUserRef = ref(db, `users/${otherUserId}`);
        const otherUserListener = onValue(otherUserRef, (snapshot) => {
            if (snapshot.exists()) {
                setOtherUser({ id: otherUserId, ...snapshot.val() });
            }
        });

        // Listen for messages
        const messagesRef = ref(db, `messages/${chatId}`);
        const messagesListener = onValue(messagesRef, (snapshot) => {
            const data = snapshot.val();
            const updates: { [key: string]: any } = {};

            if (data) {
                const messagesList: Message[] = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).sort((a, b) => a.timestamp - b.timestamp);
                
                messagesList.forEach(message => {
                     // If message is not from me and I haven't read it
                    if (message.senderId !== currentUser.id && (!message.readBy || !message.readBy[currentUser.id])) {
                        updates[`/messages/${chatId}/${message.id}/readBy/${currentUser.id}`] = true;
                    }
                });

                if(Object.keys(updates).length > 0) {
                    update(ref(db), updates);
                }

                setMessages(messagesList);
            }
        });
        
        return () => {
            off(otherUserRef, 'value', otherUserListener);
            off(messagesRef, 'value', messagesListener);
        }

    }, [currentUser, chatId]);
    
    useEffect(() => {
        // Scroll to bottom when new messages arrive
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    const handleSendMessage = () => {
        if (newMessage.trim() === '' || !currentUser) return;
        
        const messagesContainerRef = ref(db, `messages/${chatId}`);
        const newMessageRef = push(messagesContainerRef);
        const messageData: Omit<Message, 'id'> = {
            senderId: currentUser.id,
            text: newMessage.trim(),
            timestamp: Date.now(),
            readBy: { [currentUser.id]: true } // Mark as read by sender immediately
        };
        set(newMessageRef, messageData);
        setNewMessage('');
    };

    if (!isClient || !currentUser || !otherUser) {
        return null; // Or a loading spinner
    }
    
    const visibleMessages = messages.filter(msg => !msg.deletedFor || !msg.deletedFor[currentUser.id]);

    return (
        <div className="flex flex-col h-screen">
            <Header
                currentUser={currentUser}
                onLogout={() => {
                    localStorage.removeItem('currentUser');
                    router.push('/');
                }}
                onUpdateProfile={() => {}}
                userPosts={[]}
            />
            <div className="flex flex-1 overflow-hidden">
                <LeftSidebar
                    currentUser={currentUser}
                    onLogout={() => {
                        localStorage.removeItem('currentUser');
                        router.push('/');
                    }}
                    onUpdateProfile={() => {}}
                    userPosts={[]}
                />
                <main className="flex-1 flex flex-col p-0">
                    <Card className="flex-1 flex flex-col rounded-none border-0 md:border">
                        <CardHeader className="p-3 border-b flex-row items-center gap-3">
                            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={otherUser.avatar} />
                                <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-base">{otherUser.name}</CardTitle>
                                <CardDescription className="text-xs">
                                    <span className="text-green-500">Online</span>
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-4 overflow-hidden">
                            <ScrollArea className="h-full" ref={scrollAreaRef as any}>
                                <div className="space-y-4">
                                    {visibleMessages.map(message => (
                                        <div key={message.id} className={cn("flex items-end gap-2 group", message.senderId === currentUser.id ? "justify-end" : "justify-start")}>
                                            {message.senderId !== currentUser.id && (
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={otherUser.avatar} />
                                                    <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            )}
                                             <div className={cn("flex items-center gap-1", message.senderId === currentUser.id ? "flex-row-reverse" : "flex-row")}>
                                                <div className={cn("max-w-xs p-3 rounded-lg text-sm", message.senderId === currentUser.id ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                                                    <p>{message.text}</p>
                                                    <p className={cn("text-xs mt-1", message.senderId === currentUser.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                                        {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                                                    </p>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                   <MessageOptionsMenu message={message} currentUser={currentUser} chatId={chatId} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {visibleMessages.length === 0 && (
                                        <div className="text-center text-muted-foreground py-10">
                                            You are now connected. Start the conversation!
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                        <div className="p-4 border-t">
                            <div className="flex items-center gap-2">
                                <Input 
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <Button size="icon" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </main>
                <RightSidebar />
            </div>
        </div>
    );
}
