
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { ref, onValue, update } from 'firebase/database';
import {
  Users,
  Rss,
  Store,
  Clapperboard,
  Calendar,
  Clock,
  Bookmark,
  Flag,
  Settings,
  ShieldQuestion,
  LogOut,
  Home,
  BadgeCheck,
  Copyright,
  BarChart,
  ThumbsUp,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileSettingsDialog } from '@/components/profile-settings-dialog';
import type { User, Post } from '@/lib/types';
import { PostIcon } from '@/components/post-icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/header';
import { RightSidebar } from '@/components/right-sidebar';

const socialLinks = [
  { href: '/friends', icon: Users, label: 'Friends' },
  { href: '/following', icon: Rss, label: 'Following' },
];

const activityLinks = [
  { href: '/liked', icon: ThumbsUp, label: 'Saved' },
  { href: '/comments', icon: Clock, label: 'Memories' },
  { href: '/reels', icon: Clapperboard, label: 'Reels' },
];

const settingLinks = [
    { href: 'mailto:uranetworksresponse@gmail.com', icon: ShieldQuestion, label: 'Help & Support' },
];

export default function MenuPage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userPosts, setUserPosts] = useState<Post[]>([]);
    const [isClient, setIsClient] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [theme, setTheme] = useState('dark');

    const router = useRouter();

    useEffect(() => {
        setIsClient(true);
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            const userRef = ref(db, `users/${user.id}`);
            onValue(userRef, (snapshot) => {
                 if (snapshot.exists()) {
                    setCurrentUser({id: user.id, ...snapshot.val()});
                } else {
                    handleLogout();
                }
            });
        } else {
            router.push('/');
        }
         const postsRef = ref(db, 'posts');
          onValue(postsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
              const allPosts: Post[] = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
              }));
               if (savedUser) {
                  const filtered = allPosts.filter(p => p.user && p.user.id === JSON.parse(savedUser).id);
                  setUserPosts(filtered);
              }
            }
          });

    }, [router]);
    
      const handleLogout = () => {
        localStorage.removeItem('currentUser');
        router.push('/');
      };

      const handleUpdateProfile = (name: string, avatarUrl: string) => {
        if (!currentUser) return;

        const updates: { [key: string]: any } = {};
        updates[`/users/${currentUser.id}/name`] = name;
        updates[`/users/${currentUser.id}/avatar`] = avatarUrl;
        
        userPosts.forEach(post => {
          if (post.user && post.user.id === currentUser.id) {
            updates[`/posts/${post.id}/user/name`] = name;
            updates[`/posts/${post.id}/user/avatar`] = avatarUrl;
          }
        });

        update(ref(db), updates);
      };

      const totalRevenue = useMemo(() => {
        if (!currentUser?.isMonetized || !userPosts) return 0;
        return userPosts.reduce((total, post) => {
            if (!post || !post.user) return total;
            const views = post.views || 0;
            let postRevenue = 0;
            if(post.video) {
                postRevenue = (views / 1250) * 25;
            } else if (post.image) {
                postRevenue = (views / 1250) * 15;
            } else {
                postRevenue = (views / 1250) * 10;
            }
            return total + postRevenue;
        }, 0);
      }, [userPosts, currentUser?.isMonetized]);

    if (!isClient || !currentUser) {
        return null; // Or a loading spinner
    }

    return (
        <div className="flex flex-col h-screen">
        <Header 
            currentUser={currentUser}
            onLogout={handleLogout}
            onUpdateProfile={handleUpdateProfile}
            userPosts={userPosts}
            theme={theme}
            setTheme={setTheme}
         />
        <div className="flex-1 flex overflow-hidden">
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
                    <Home className="mr-2 h-4 w-4" /> Back to Home
                </Button>
                <div className="space-y-1">
                {currentUser && (
                    <Button variant="ghost" className="w-full justify-start gap-3 px-3 h-14" asChild>
                        <Link href={`/profile/${currentUser.id}`}>
                            <Avatar>
                                <AvatarImage src={currentUser.avatar} />
                                <AvatarFallback>
                                <PostIcon className="h-6 w-6" />
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-lg">{currentUser.name}</span>
                        </Link>
                    </Button>
                )}
                </div>
                <Separator className="my-4" />

                <h3 className="text-sm font-semibold text-muted-foreground px-3 mb-2">Social</h3>
                <nav className="space-y-1">
                {socialLinks.map(({ href, icon: Icon, label }) => (
                    <Button key={label} variant="ghost" className="w-full justify-start gap-3 px-3" asChild>
                        <Link href={href}>
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            <span className="font-semibold">{label}</span>
                        </Link>
                    </Button>
                ))}
                </nav>
                <Separator className="my-4" />
                
                <h3 className="text-sm font-semibold text-muted-foreground px-3 mb-2">Your Activity</h3>
                <nav className="space-y-1">
                {activityLinks.map(({ href, icon: Icon, label }) => (
                    <Button key={label} variant="ghost" className="w-full justify-start gap-3 px-3" asChild>
                         <Link href={href}>
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            <span className="font-semibold">{label}</span>
                        </Link>
                    </Button>
                ))}
                         <Button variant="ghost" className="w-full justify-start gap-3 px-3" asChild>
                             <Link href="/analytics">
                                <BarChart className="h-5 w-5 text-muted-foreground" />
                                <span className="font-semibold">Analytics</span>
                            </Link>
                        </Button>
                </nav>
                 <Separator className="my-4" />
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Your Content & Revenue</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                         <div className="flex items-center justify-between text-sm">
                             <Button variant="ghost" className="w-full justify-start gap-3 px-0" asChild>
                                 <Link href="/copyright">
                                    <Copyright className="h-5 w-5 text-muted-foreground" />
                                    <span className="font-semibold">Copyright Center</span>
                                </Link>
                             </Button>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Account Status</span>
                            {currentUser.isMonetized ? (
                                <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
                                    <BadgeCheck className="mr-1 h-3 w-3"/>
                                    Monetized
                                </Badge>
                            ) : (
                                <Badge variant="secondary">Unmonetized</Badge>
                            )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Posts</span>
                            <span className="font-bold">{userPosts.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total Revenue</span>
                            <span className="font-bold text-green-500 flex items-center gap-1">
                                ₹{totalRevenue.toFixed(2)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
                <Separator className="my-4" />
                <nav className="space-y-1">
                {currentUser && (
                    <ProfileSettingsDialog 
                    currentUser={currentUser}
                    onUpdateProfile={handleUpdateProfile}
                    isOpen={isSettingsOpen}
                    onOpenChange={setIsSettingsOpen}
                    theme={theme}
                    setTheme={setTheme}
                    >
                    <Button variant="ghost" className="w-full justify-start gap-3 px-3" onClick={() => setIsSettingsOpen(true)}>
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        <span className="font-semibold">Settings & Privacy</span>
                    </Button>
                    </ProfileSettingsDialog>
                )}
                {settingLinks.map(({ href, icon: Icon, label }) => (
                    <Button key={label} variant="ghost" className="w-full justify-start gap-3 px-3" asChild>
                       <a href={href}>
                         <Icon className="h-5 w-5 text-muted-foreground" />
                         <span className="font-semibold">{label}</span>
                       </a>
                    </Button>
                ))}
                <Button variant="ghost" className="w-full justify-start gap-3 px-3" onClick={handleLogout}>
                    <LogOut className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Logout</span>
                </Button>
                </nav>
            </main>
             <div className="hidden lg:block">
                <RightSidebar />
             </div>
        </div>
    </div>
    );
}

