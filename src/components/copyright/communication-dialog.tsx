
'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { User, CopyrightMessage, CopyrightClaim } from '@/lib/types';
import { ref, onValue, off, push, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Send, Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PostIcon } from '../post-icon';

interface CommunicationDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    currentUser: User;
    claimId: string;
}

export function CommunicationDialog({ isOpen, onOpenChange, currentUser, claimId }: CommunicationDialogProps) {
    const { toast } = useToast();
    const [messages, setMessages] = useState<CopyrightMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [claim, setClaim] = useState<CopyrightClaim | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen || !claimId) return;

        setIsLoading(true);
        const claimRef = ref(db, `copyrightClaims/${claimId}`);

        const listener = onValue(claimRef, (snapshot) => {
            const claimData = snapshot.val();
            if (claimData) {
                setClaim(claimData);
                const messagesList = claimData.messages ? Object.values(claimData.messages).sort((a: any, b: any) => a.timestamp - b.timestamp) : [];
                setMessages(messagesList as CopyrightMessage[]);
            } else {
                 toast({ title: "Error", description: "Could not load claim details.", variant: "destructive" });
                 onOpenChange(false);
            }
            setIsLoading(false);
        });

        return () => off(claimRef, 'value', listener);

    }, [isOpen, claimId, onOpenChange, toast]);

    useEffect(() => {
        // Scroll to bottom when messages change
        if(scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (newMessage.trim() === '' || !claimId) return;

        const messageData = {
            id: '',
            senderId: currentUser.id,
            senderName: currentUser.name,
            text: newMessage.trim(),
            timestamp: Date.now(),
        };

        try {
            const messagesRef = ref(db, `copyrightClaims/${claimId}/messages`);
            const newMessageRef = push(messagesRef);
            messageData.id = newMessageRef.key!;
            await set(newMessageRef, messageData);
            setNewMessage('');
        } catch (error) {
            toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
        }
    };
    
    const otherPartyName = claim?.claimantId === currentUser.id ? claim?.accusedUsername : claim?.claimantName;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg flex flex-col h-[70vh]">
                <DialogHeader>
                    <DialogTitle>Conversation</DialogTitle>
                    <DialogDescription>
                        Communicating with {otherPartyName || 'the other party'} regarding claim #{claimId.substring(0, 5)}...
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <ScrollArea className="h-full pr-4" ref={scrollAreaRef as any}>
                        <div className="space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={cn("flex items-end gap-2", msg.senderId === currentUser.id ? "justify-end" : "justify-start")}>
                                     {msg.senderId !== currentUser.id && (
                                        <Avatar className="h-6 w-6">
                                            <AvatarFallback>{otherPartyName?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>
                                     )}
                                     <div className={cn("max-w-xs md:max-w-sm p-3 rounded-lg text-sm", msg.senderId === currentUser.id ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                                        <p>{msg.text}</p>
                                        <p className={cn("text-xs mt-1", msg.senderId === currentUser.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                            {format(new Date(msg.timestamp), "h:mm a")}
                                        </p>
                                    </div>
                                    {msg.senderId === currentUser.id && (
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={currentUser.avatar} />
                                            <AvatarFallback><PostIcon className="h-4 w-4" /></AvatarFallback>
                                        </Avatar>
                                     )}
                                </div>
                            ))}
                             {messages.length === 0 && (
                                <div className="text-center text-muted-foreground py-10">
                                    No messages yet. Start the conversation.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
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
            </DialogContent>
        </Dialog>
    );
}


