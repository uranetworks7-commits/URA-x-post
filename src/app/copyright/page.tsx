
'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, update } from "firebase/database";
import { Header } from '@/components/header';
import { RightSidebar } from '@/components/right-sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copyright, ArrowLeft, Leaf } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/types';
import { CopyrightStrikeAlert } from '@/components/copyright/copyright-strike-alert';
import { CtrRequestDialog } from '@/components/copyright/ctr-request-dialog';
import { CopyrightHistory } from '@/components/copyright/copyright-history';

export default function CopyrightPage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [users, setUsers] = useState<{ [key: string]: User }>({});
    const [isCtrDialogOpen, setIsCtrDialogOpen] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        setIsClient(true);
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            const user: User = JSON.parse(savedUser);
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
        
        const usersRef = ref(db, 'users');
        onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            if(data) setUsers(data);
        });

    }, [router]);

    const activeStrikes = currentUser?.copyrightStrikes 
        ? Object.values(currentUser.copyrightStrikes).filter(s => s.status === 'active')
        : [];

    const handleAdminAccess = () => {
        const key = prompt("Enter security key to access admin panel:");
        if (key === 'Utkarsh225') {
            router.push('/copyright-admin');
        } else if(key !== null) {
            toast({
                title: "Access Denied",
                description: "The security key is incorrect.",
                variant: "destructive"
            });
        }
    };
    
    if (!isClient || !currentUser) {
        return null; // or a loading spinner
    }

    return (
        <>
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
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                        {activeStrikes.length > 0 && <CopyrightStrikeAlert strikes={activeStrikes} />}
                        <Card>
                            <CardHeader className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                                            <ArrowLeft className="h-5 w-5" />
                                        </Button>
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Copyright className="h-5 w-5 text-primary" />
                                                Copyright Center
                                            </CardTitle>
                                            <CardDescription className="text-xs">Manage your copyright claims and strikes.</CardDescription>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={handleAdminAccess} title="Admin Panel">
                                        <Leaf className="h-5 w-5 text-green-500" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 grid md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader className="p-3">
                                        <CardTitle className="text-base">Your Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xs space-y-2 p-3 pt-0">
                                        <p><strong>Username:</strong> {currentUser.name}</p>
                                        <p><strong>Main Account:</strong> {currentUser.mainAccountUsername}</p>
                                        <p><strong>Monetization:</strong> {currentUser.isMonetized ? 'Enabled' : 'Disabled'}</p>
                                        <p><strong>User ID:</strong> <span className="font-mono">{currentUser.id}</span></p>
                                        <p><strong>Active Strikes:</strong> <span className="font-bold text-destructive">{activeStrikes.length} / 3</span></p>
                                    </CardContent>
                                </Card>
                                 <Card className="flex flex-col justify-center items-center p-4">
                                    <CardTitle className="text-base mb-2">Request a Takedown</CardTitle>
                                    <CardDescription className="text-center text-xs mb-4">
                                        If someone has copied your content, you can submit a copyright takedown request.
                                    </CardDescription>
                                    <Button size="sm" onClick={() => setIsCtrDialogOpen(true)}>
                                        Submit a CTR
                                    </Button>
                                </Card>
                            </CardContent>
                        </Card>

                        <CopyrightHistory currentUser={currentUser} />

                    </main>
                    <RightSidebar />
                </div>
            </div>
            <CtrRequestDialog 
                isOpen={isCtrDialogOpen}
                onOpenChange={setIsCtrDialogOpen}
                currentUser={currentUser}
                users={users}
            />
        </>
    );
}

    