
'use client';
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, update } from "firebase/database";
import type { User } from '@/lib/types';
import { Header } from '@/components/header';
import { LeftSidebar } from '@/components/left-sidebar';
import { RightSidebar } from '@/components/right-sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Rss, UserMinus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DeletePostDialog } from '@/components/delete-post-dialog';

export default function FollowingPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<{ [id: string]: User }>({});
  const [isClient, setIsClient] = useState(false);
  const [userToUnfollow, setUserToUnfollow] = useState<User | null>(null);
  const [isUnfollowDialogOpen, setIsUnfollowDialogOpen] = useState(false);
  const router = useRouter();

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
    if(isClient) {
        const usersRef = ref(db, 'users');
        onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            if(data) {
                setAllUsers(data);
            }
        });
    }
  }, [isClient]);

  const followingList = useMemo(() => {
    if (!currentUser?.following || !Object.keys(allUsers).length) return [];
    return Object.keys(currentUser.following)
        .map(userId => ({ id: userId, ...allUsers[userId] }))
        .filter(user => user.name); // Filter out any users that might not exist in the allUsers object yet
  }, [currentUser, allUsers]);

  const handleUnfollowClick = (user: User) => {
    setUserToUnfollow(user);
    setIsUnfollowDialogOpen(true);
  };

  const confirmUnfollow = () => {
    if (!currentUser || !userToUnfollow) return;

    const currentUserId = currentUser.id;
    const userIdToUnfollow = userToUnfollow.id;
    const updates: { [key: string]: any } = {};

    updates[`/users/${currentUserId}/following/${userIdToUnfollow}`] = null;
    updates[`/users/${userIdToUnfollow}/followers/${currentUserId}`] = null;
    
    update(ref(db), updates);
    setIsUnfollowDialogOpen(false);
    setUserToUnfollow(null);
  };

  if (!isClient || !currentUser) {
    return null; // or a loading spinner
  }

  return (
    <>
      <div className="flex flex-col h-screen">
        <Header 
          currentUser={currentUser}
          onLogout={() => { localStorage.removeItem('currentUser'); router.push('/'); }}
          onUpdateProfile={() => {}}
          userPosts={[]}
        />
        <div className="flex flex-1 overflow-hidden">
          <LeftSidebar 
            currentUser={currentUser} 
            onLogout={() => { localStorage.removeItem('currentUser'); router.push('/'); }}
            onUpdateProfile={() => {}}
            userPosts={[]}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            <Card>
              <CardHeader className="p-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Rss className="h-5 w-5 text-primary" />
                      Following
                    </CardTitle>
                    <CardDescription className="text-xs">Accounts you follow.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {followingList.length > 0 ? (
                  <div className="space-y-3">
                    {followingList.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary">
                        <Link href={`/profile/${user.id}`} className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.mainAccountUsername}</p>
                          </div>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => handleUnfollowClick(user)}>
                            <UserMinus className="mr-2 h-4 w-4" />
                            Unfollow
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">You are not following anyone yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
          <RightSidebar />
        </div>
      </div>
      <DeletePostDialog
        isOpen={isUnfollowDialogOpen}
        onOpenChange={setIsUnfollowDialogOpen}
        onConfirm={confirmUnfollow}
      />
    </>
  );
}

    