
'use client';
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from "firebase/database";
import type { User } from '@/lib/types';
import { Header } from '@/components/header';
import { LeftSidebar } from '@/components/left-sidebar';
import { RightSidebar } from '@/components/right-sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, MessageSquare, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

export default function FriendsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<{ [id: string]: User }>({});
  const [isClient, setIsClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const friendsList = useMemo(() => {
    if (!currentUser?.following || !Object.keys(allUsers).length) return [];
    return Object.keys(currentUser.following)
        .map(userId => ({ id: userId, ...allUsers[userId] }))
        .filter(user => user.name && user.following && user.following[currentUser.id]); // Check for mutual follow
  }, [currentUser, allUsers]);
  
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    return Object.values(allUsers).filter(user => 
        user.name && user.id !== currentUser?.id && user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allUsers, currentUser]);

  const handleStartChat = (friendId: string) => {
    if (!currentUser) return;
    const chatId = [currentUser.id, friendId].sort().join('_');
    router.push(`/messages/${chatId}`);
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
                      <Users className="h-5 w-5 text-primary" />
                      Friends
                    </CardTitle>
                    <CardDescription className="text-xs">Search for users or see your mutual connections.</CardDescription>
                  </div>
                </div>
                 <div className="relative mt-4">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search for any user..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {searchQuery ? (
                     <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Search Results</h3>
                        {searchResults.length > 0 ? (
                            searchResults.map((user) => (
                                <Link href={`/profile/${user.id}`} key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={user.avatar} />
                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-bold text-sm">{user.name}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                             <div className="text-center py-10">
                                <p className="text-muted-foreground">No users found for "{searchQuery}".</p>
                            </div>
                        )}
                    </div>
                ) : (
                    friendsList.length > 0 ? (
                    <div className="space-y-3">
                        {friendsList.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary">
                            <Link href={`/profile/${user.id}`} className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-bold text-sm">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.mainAccountUsername}</p>
                            </div>
                            </Link>
                            <Button variant="outline" size="sm" onClick={() => handleStartChat(user.id)}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Chat
                            </Button>
                        </div>
                        ))}
                    </div>
                    ) : (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">You have no friends yet. Start following people who follow you!</p>
                    </div>
                    )
                )}
              </CardContent>
            </Card>
          </main>
          <RightSidebar />
        </div>
      </div>
    </>
  );
}
