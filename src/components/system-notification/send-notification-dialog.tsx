
'use client';
import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { ref, get, push, update } from 'firebase/database';
import { AlertTriangle, DollarSign, Info, Loader2 } from 'lucide-react';
import type { Notification, User } from '@/lib/types';


interface SendNotificationDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

const formSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  message: z.string().min(1, { message: "Message is required." }),
  icon: z.enum(['alert', 'dollar', 'info'], { required_error: "An icon is required." }),
});

export function SendNotificationDialog({ isOpen, onOpenChange }: SendNotificationDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            message: "",
            icon: "info",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            const usersRef = ref(db, 'users');
            const snapshot = await get(usersRef);

            if (snapshot.exists()) {
                const usersData = snapshot.val();
                let targetUserId: string | null = null;
                
                for (const userId in usersData) {
                    if (usersData[userId].name === values.username) {
                        targetUserId = userId;
                        break;
                    }
                }

                if (targetUserId) {
                    const notifRef = push(ref(db, `users/${targetUserId}/notifications`));
                    const newNotification: Notification = {
                        id: notifRef.key!,
                        type: 'SYSTEM_MESSAGE',
                        senderName: 'System',
                        message: values.message,
                        systemIcon: values.icon,
                        timestamp: Date.now(),
                        isRead: false,
                    };

                    await update(ref(db), { [`/users/${targetUserId}/notifications/${notifRef.key}`]: newNotification });
                    
                    toast({
                        title: "Notification Sent",
                        description: `Message sent to ${values.username}.`,
                    });
                    onOpenChange(false);
                    form.reset();

                } else {
                    toast({
                        title: "User Not Found",
                        description: `Could not find user "${values.username}".`,
                        variant: "destructive",
                    });
                }
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error Sending Notification",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handleClose = (open: boolean) => {
        if (!open) {
            form.reset();
        }
        onOpenChange(open);
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Send System Notification</DialogTitle>
                    <DialogDescription>
                        Send a custom notification to any user on the platform.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Username</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter the recipient's username" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Message</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Type your message here" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="icon"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <FormLabel>Icon Type</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex space-x-4"
                                        >
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="alert" /></FormControl>
                                                <FormLabel className="font-normal flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-destructive" /> Alert</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="dollar" /></FormControl>
                                                <FormLabel className="font-normal flex items-center gap-1"><DollarSign className="h-4 w-4 text-green-500" /> Dollar</FormLabel>
                                            </FormItem>
                                             <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="info" /></FormControl>
                                                <FormLabel className="font-normal flex items-center gap-1"><Info className="h-4 w-4 text-blue-500" /> Info</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Notification
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
