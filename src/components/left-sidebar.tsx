
'use client';
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
  DollarSign,
  BarChart,
  BadgeCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ProfileSettingsDialog } from './profile-settings-dialog';
import type { User, Post } from './post-card';
import { PostIcon } from './post-icon';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface LeftSidebarProps {
    currentUser: User | null;
    onLogout: () => void;
    onUpdateProfile: (name: string, avatarUrl: string) => void;
    userPosts: Post[];
    theme: string;
    setTheme: (theme: string) => void;
}

const mainLinks = [
  { icon: Rss, label: 'Feeds' },
  { icon: Bookmark, label: 'Saved' },
];

const settingLinks = [
  { icon: ShieldQuestion, label: 'Help & Support' },
];

export function LeftSidebar({ currentUser, onLogout, onUpdateProfile, userPosts, theme, setTheme }: LeftSidebarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  if (!currentUser) return null;

  return (
    <aside className="hidden md:block w-80 bg-card border-r border-border">
      <ScrollArea className="h-full p-4">
        <nav className="space-y-1">
           {currentUser && (
            <Button variant="ghost" className="w-full justify-start gap-3 px-3 h-14">
                <Avatar>
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback>
                      <PostIcon className="h-6 w-6" />
                    </AvatarFallback>
                </Avatar>
                <span className="font-bold text-lg">{currentUser.name}</span>
              </Button>
           )}
          {mainLinks.map(({ icon: Icon, label }) => (
            <Button key={label} variant="ghost" className="w-full justify-start gap-3 px-3">
              <Icon className="h-5 w-5 text-primary" />
              <span className="font-semibold">{label}</span>
            </Button>
          ))}
        </nav>
        <Separator className="my-4" />
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Your Content & Revenue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
              onUpdateProfile={onUpdateProfile}
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
          {settingLinks.map(({ icon: Icon, label }) => (
            <Button key={label} variant="ghost" className="w-full justify-start gap-3 px-3">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">{label}</span>
            </Button>
          ))}
           <Button variant="ghost" className="w-full justify-start gap-3 px-3" onClick={onLogout}>
              <LogOut className="h-5 w-5 text-primary" />
              <span className="font-semibold">Logout</span>
            </Button>
        </nav>
      </ScrollArea>
    </aside>
  );
}

    
