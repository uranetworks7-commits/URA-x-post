
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { SendNotificationDialog } from './send-notification-dialog';

interface PasswordDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function PasswordDialog({ isOpen, onOpenChange }: PasswordDialogProps) {
    const [password, setPassword] = useState('');
    const { toast } = useToast();
    const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);

    const handleCheckPassword = () => {
        if (password === 'Utkarsh225') {
            onOpenChange(false); // Close password dialog
            setIsSendDialogOpen(true); // Open send notification dialog
            setPassword('');
        } else {
            toast({
                title: "Incorrect Password",
                variant: "destructive",
            });
            setPassword('');
        }
    };

    const handleParentClose = (open: boolean) => {
        if(!open) setPassword('');
        onOpenChange(open);
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleParentClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Admin Access</DialogTitle>
                        <DialogDescription>
                            Enter the password to send a system notification.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCheckPassword()}
                        />
                    </div>
                    <DialogFooter>
                         <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleCheckPassword}>Submit</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <SendNotificationDialog 
                isOpen={isSendDialogOpen}
                onOpenChange={setIsSendDialogOpen}
            />
        </>
    );
}
