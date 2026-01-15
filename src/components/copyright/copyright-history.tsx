
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, CopyrightClaim, CopyrightStrike } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MessageSquare, Undo2, Loader2, FileSearch, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CommunicationDialog } from './communication-dialog';
import { StrikeContentDialog } from './strike-content-dialog';
import { DeletePostConfirmDialog } from '../delete-post-dialog-confirm';


interface CopyrightHistoryProps {
    currentUser: User;
}

const getStatusVariant = (status: 'pending' | 'approved' | 'rejected' | 'retracted' | 'active' | 'expired') => {
    switch (status) {
        case 'pending': return 'secondary';
        case 'approved':
        case 'active': return 'default';
        case 'rejected':
        case 'expired': return 'outline';
        case 'retracted': return 'destructive';
        default: return 'secondary';
    }
};

const getStatusColor = (status: 'pending' | 'approved' | 'rejected' | 'retracted' | 'active' | 'expired') => {
     switch (status) {
        case 'pending': return 'bg-yellow-500';
        case 'approved':
        case 'active': return 'bg-green-500';
        case 'rejected':
        case 'expired': return '';
        case 'retracted': return 'bg-red-500';
        default: return '';
    }
}

export function CopyrightHistory({ currentUser }: CopyrightHistoryProps) {
    const { toast } = useToast();
    const [isRetractDialogOpen, setIsRetractDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [dialogContent, setDialogContent] = useState({ title: '', onConfirm: () => {} });
    const [selectedClaim, setSelectedClaim] = useState<CopyrightClaim | null>(null);
    const [selectedStrike, setSelectedStrike] = useState<CopyrightStrike | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCommDialogOpen, setIsCommDialogOpen] = useState(false);
    const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);

    const submittedClaims = currentUser.submittedClaims ? Object.values(currentUser.submittedClaims).sort((a, b) => b.date - a.date) : [];
    const receivedStrikes = currentUser.copyrightStrikes ? Object.values(currentUser.copyrightStrikes).sort((a, b) => b.receivedAt - a.receivedAt) : [];
    const activeStrikesCount = receivedStrikes.filter(s => s.status === 'active').length;

    const handleRetractClick = (claim: CopyrightClaim) => {
        setSelectedClaim(claim);
        setIsRetractDialogOpen(true);
    }
    
    const handleContactClick = (claim: CopyrightClaim) => {
        setSelectedClaim(claim);
        setIsCommDialogOpen(true);
    };

    const handleViewContentClick = (strike: CopyrightStrike) => {
        setSelectedStrike(strike);
        setIsContentDialogOpen(true);
    };
    
    const handleDeleteStrikeClick = (strike: CopyrightStrike) => {
        setSelectedStrike(strike);
        setDialogContent({
            title: "Are you sure you want to delete this strike from your history?",
            onConfirm: handleConfirmDeleteStrike,
        });
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteClaimClick = (claim: CopyrightClaim) => {
        setSelectedClaim(claim);
        setDialogContent({
            title: "Are you sure you want to delete this claim from your history?",
            onConfirm: handleConfirmDeleteClaim,
        });
        setIsDeleteDialogOpen(true);
    };


    const handleConfirmRetract = async () => {
        if (!selectedClaim) return;
        setIsProcessing(true);

        try {
            const updates: { [key: string]: any } = {};
            // Set claim status to retracted
            updates[`/copyrightClaims/${selectedClaim.id}/status`] = 'retracted';
            updates[`/users/${currentUser.id}/submittedClaims/${selectedClaim.id}/status`] = 'retracted';
            
            // Mark the strike as retracted instead of removing it
            updates[`/users/${selectedClaim.accusedUserId}/copyrightStrikes/${selectedClaim.id}/status`] = 'retracted';

            await update(ref(db), updates);
            toast({ title: "Claim Retracted", description: "The copyright strike has been successfully updated to 'retracted'." });

        } catch (error) {
            toast({ title: "Error", description: "Failed to retract the claim.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
            setIsRetractDialogOpen(false);
            setSelectedClaim(null);
        }
    }
    
    const handleConfirmDeleteStrike = async () => {
        if (!selectedStrike) return;
        setIsProcessing(true);

        try {
            const updates: { [key: string]: any } = {};
            updates[`/users/${currentUser.id}/copyrightStrikes/${selectedStrike.strikeId}`] = null;
            
            await update(ref(db), updates);
            toast({ title: "Strike Deleted", description: "The strike has been removed from your history." });

        } catch (error) {
             toast({ title: "Error", description: "Failed to delete the strike.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
            setIsDeleteDialogOpen(false);
            setSelectedStrike(null);
        }
    };
    
    const handleConfirmDeleteClaim = async () => {
        if (!selectedClaim) return;
        setIsProcessing(true);

        try {
            const updates: { [key: string]: any } = {};
            updates[`/users/${currentUser.id}/submittedClaims/${selectedClaim.id}`] = null;
            
            await update(ref(db), updates);
            toast({ title: "Claim Deleted", description: "The claim has been removed from your history." });

        } catch (error) {
             toast({ title: "Error", description: "Failed to delete the claim.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
            setIsDeleteDialogOpen(false);
            setSelectedClaim(null);
        }
    };


    return (
        <>
        <Card>
            <CardHeader className="p-4">
                <CardTitle>Copyright History</CardTitle>
                <CardDescription>View your submitted claims and received strikes.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <Tabs defaultValue="strikes">
                    <TabsList className="grid w-full grid-cols-2 h-9">
                        <TabsTrigger value="strikes" className="text-xs h-full">Strikes Against You</TabsTrigger>
                        <TabsTrigger value="claims" className="text-xs h-full">Claims You Submitted</TabsTrigger>
                    </TabsList>
                    <TabsContent value="strikes" className="mt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Claimant</TableHead>
                                    <TableHead>Date Received</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {receivedStrikes.length > 0 ? receivedStrikes.map(strike => (
                                    <TableRow key={strike.strikeId}>
                                        <TableCell>{strike.claimantName}</TableCell>
                                        <TableCell>{format(new Date(strike.receivedAt), 'dd MMM yy')}</TableCell>
                                        <TableCell>
                                            {activeStrikesCount >= 3 && strike.status === 'active' 
                                                ? "Not Expired" 
                                                : strike.status === 'active' 
                                                    ? format(new Date(strike.expiresAt), 'dd MMM yy') 
                                                    : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(strike.status)} className={getStatusColor(strike.status)}>{strike.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => handleViewContentClick(strike)}><FileSearch className="h-4 w-4 mr-2" /> View</Button>
                                            <Button variant="outline" size="sm" onClick={() => handleContactClick({ id: strike.strikeId } as CopyrightClaim)}><MessageSquare className="h-4 w-4 mr-2" /> Contact</Button>
                                             {(strike.status === 'expired' || strike.status === 'retracted') && (
                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteStrikeClick(strike)}>
                                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">You have not received any copyright strikes.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TabsContent>
                    <TabsContent value="claims" className="mt-4">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Accused User</TableHead>
                                    <TableHead>Date Submitted</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {submittedClaims.length > 0 ? submittedClaims.map(claim => (
                                    <TableRow key={claim.id}>
                                        <TableCell>{claim.accusedUsername}</TableCell>
                                        <TableCell>{format(new Date(claim.date), 'dd MMM yy')}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(claim.status)} className={getStatusColor(claim.status)}>{claim.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                             <Button variant="outline" size="sm" onClick={() => handleContactClick(claim)}><MessageSquare className="h-4 w-4 mr-2" /> Contact</Button>
                                            {claim.status === 'approved' && (
                                                <Button variant="destructive" size="sm" onClick={() => handleRetractClick(claim)}><Undo2 className="h-4 w-4 mr-2" /> Retract</Button>
                                            )}
                                            {(claim.status === 'rejected' || claim.status === 'retracted') && (
                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteClaimClick(claim)}>
                                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">You have not submitted any copyright claims.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
        <AlertDialog open={isRetractDialogOpen} onOpenChange={setIsRetractDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will retract your copyright claim and remove the strike from the user's account. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmRetract} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : "Confirm Retract"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <DeletePostConfirmDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onConfirm={dialogContent.onConfirm}
            title={dialogContent.title}
        />
        {selectedClaim && (
            <CommunicationDialog
                isOpen={isCommDialogOpen}
                onOpenChange={setIsCommDialogOpen}
                claimId={selectedClaim.id}
                currentUser={currentUser}
            />
        )}
        {selectedStrike && (
             <StrikeContentDialog
                isOpen={isContentDialogOpen}
                onOpenChange={setIsContentDialogOpen}
                strike={selectedStrike}
            />
        )}
        </>
    );
}
