
'use client';
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, update } from "firebase/database";
import type { Post, User, Withdrawal } from '@/components/post-card';
import { Header } from '@/components/header';
import { RightSidebar } from '@/components/right-sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { DollarSign, Eye, ThumbsUp, ArrowLeft, BadgeCheck, PartyPopper, History, Search, ShieldCheck, Copy, Copyright, Users, Rss } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { WithdrawDialog } from '@/components/withdraw-dialog';
import { PostDetailsDialog } from '@/components/post-details-dialog';
import Link from 'next/link';


export default function AnalyticsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);


  useEffect(() => {
    setIsClient(true);
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
       const userRef = ref(db, `users/${user.id}`);
        onValue(userRef, (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                setCurrentUser(userData);
                localStorage.setItem('currentUser', JSON.stringify(userData));
            }
        });
    } else {
        router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (isClient) {
      const postsRef = ref(db, 'posts');
      onValue(postsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const allPosts: Post[] = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          }));
          setPosts(allPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
        }
      });
    }
  }, [isClient]);
  
  const userPosts = useMemo(() => {
    if (!currentUser) return [];
    return posts.filter(post => post && post.user && post.user.id === currentUser.id);
  }, [posts, currentUser]);

  const displayedPosts = useMemo(() => {
    if (showAllPosts || userPosts.length <= 3) {
      return userPosts;
    }
    return userPosts.slice(0, 3);
  }, [userPosts, showAllPosts]);

  const totalViews = useMemo(() => {
    return userPosts.reduce((acc, post) => acc + (post.views || 0), 0);
  }, [userPosts]);
  
  const totalLikes = useMemo(() => {
      if (!userPosts) return 0;
      return userPosts.reduce((acc, post) => acc + Object.keys(post.likes || {}).length, 0);
  }, [userPosts]);

  const followersCount = useMemo(() => currentUser?.followers ? Object.keys(currentUser.followers).length : 0, [currentUser]);
  const followingCount = useMemo(() => currentUser?.following ? Object.keys(currentUser.following).length : 0, [currentUser]);

  const activeStrikes = useMemo(() => currentUser?.copyrightStrikes ? Object.values(currentUser.copyrightStrikes).filter(s => s.status === 'active') : [], [currentUser]);


  const canBeMonetized = useMemo(() => {
      return totalViews >= 2000 && totalLikes >= 25;
  }, [totalViews, totalLikes]);

  const handleRequestMonetization = () => {
    if (!currentUser) return;
    if (canBeMonetized) {
      const userRef = ref(db, `users/${currentUser.id}`);
      update(userRef, { isMonetized: true });
      setCurrentUser(prev => prev ? { ...prev, isMonetized: true } : null);
      toast({
        title: "Congratulations! You're Monetized!",
        description: "You can now earn revenue from your posts.",
      });
    } else {
      toast({
        title: "Monetization Requirements Not Met",
        description: "You need at least 2,000 total views and 25 total likes across all your posts.",
        variant: "destructive",
      });
    }
  };
  
  const totalRevenue = useMemo(() => {
    if (!currentUser?.isMonetized) return 0;
    return userPosts.reduce((total, post) => {
        const views = post.views || 0;
        let postRevenue = 0;
        if (!post.isCopyrighted) {
            if(post.video) {
                postRevenue = (views / 1250) * 25;
            } else if (post.image) {
                postRevenue = (views / 1250) * 15;
            } else {
                postRevenue = (views / 1250) * 10;
            }
        }
        return total + postRevenue;
    }, 0);
}, [userPosts, currentUser?.isMonetized]);

  const totalWithdrawals = useMemo(() => {
    if (!currentUser?.withdrawals) return 0;
    return Object.values(currentUser.withdrawals)
      .reduce((acc, w) => acc + w.totalDeducted, 0);
  }, [currentUser?.withdrawals]);
  
  const availableBalance = useMemo(() => totalRevenue - totalWithdrawals, [totalRevenue, totalWithdrawals]);

  const withdrawalHistory = useMemo(() => {
    if (!currentUser?.withdrawals) return [];
    return Object.values(currentUser.withdrawals).sort((a, b) => b.timestamp - a.timestamp);
  }, [currentUser?.withdrawals]);
  
  const handleViewDetails = (post: Post) => {
    setSelectedPost(post);
    setIsDetailsDialogOpen(true);
  };
  
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
        toast({ title: "Redeem code copied!" });
    }).catch(err => {
        toast({ title: "Failed to copy code", variant: "destructive" });
    });
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
        onUpdateProfile={() => {}} // Not needed on this page
        userPosts={userPosts}
      />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            <Card>
                <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <CardTitle className="text-xl">Your Analytics</CardTitle>
                                <CardDescription className="text-xs">An overview of your content performance.</CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                        {currentUser.isMonetized ? (
                            <>
                                <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2">
                                    <BadgeCheck className="mr-1 h-3 w-3"/>
                                    Monetized
                                </Badge>
                                <Button size="sm" onClick={() => setIsWithdrawDialogOpen(true)}>Withdraw</Button>
                            </>
                        ) : (
                           <Button size="sm" onClick={handleRequestMonetization}>Request Monetization</Button>
                        )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-medium">Available</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold">₹{currentUser.isMonetized ? availableBalance.toFixed(2) : '0.00'}</div>
                                <p className="text-xs text-muted-foreground">{currentUser.isMonetized ? `Total: ₹${totalRevenue.toFixed(2)}` : "Not monetized"}</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-medium">Total Followers</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold">{followersCount.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground">&nbsp;</p>
                            </CardContent>
                        </Card>
                        <Link href="/following" className="block">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-xs font-medium">Following</CardTitle>
                                    <Rss className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xl font-bold">{followingCount.toLocaleString()}</div>
                                    <p className="text-xs text-muted-foreground">Click to view</p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-medium">Total Views</CardTitle>
                                <Eye className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold">{totalViews.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground">across {userPosts.length} posts</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-medium">Total Likes</CardTitle>
                                <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold">{totalLikes.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground">on your posts</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-medium">Copyright Strikes</CardTitle>
                                <Copyright className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold">{activeStrikes.length}</div>
                                <p className="text-xs text-muted-foreground">Active strikes</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">Post</TableHead>
                                <TableHead className="text-xs">Created</TableHead>
                                <TableHead className="text-center text-xs">Status</TableHead>
                                <TableHead className="text-right text-xs">Views</TableHead>
                                <TableHead className="text-right text-xs">Likes</TableHead>
                                <TableHead className="text-right text-xs">Comments</TableHead>
                                <TableHead className="text-right text-xs">Revenue</TableHead>
                                <TableHead className="text-right text-xs">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedPosts.map(post => {
                                const views = post.views || 0;
                                const likes = Object.keys(post.likes || {}).length;
                                
                                let revenue = 0;
                                if (currentUser.isMonetized && !post.isCopyrighted) {
                                    if(post.video) {
                                        revenue = (views / 1250) * 25;
                                    } else if (post.image) {
                                        revenue = (views / 1250) * 15;
                                    } else {
                                        revenue = (views / 1250) * 10;
                                    }
                                }

                                const isPostEligibleForMonetization = views > 1000 && likes >= 10;

                                return (
                                    <TableRow key={post.id}>
                                        <TableCell className="max-w-[100px] md:max-w-xs truncate font-medium text-xs">{post.content}</TableCell>
                                        <TableCell className="text-xs">{format(new Date(post.createdAt), 'dd MMM yy')}</TableCell>
                                        <TableCell className="text-center">
                                            {post.isCopyrighted ? (
                                                <Badge variant="destructive" className="text-xs">
                                                    <Copyright className="mr-1 h-3 w-3" />
                                                    Copyright
                                                </Badge>
                                            ) : currentUser.isMonetized ? (
                                                revenue > 0 ? (
                                                    <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">
                                                        <PartyPopper className="mr-1 h-3 w-3" />
                                                        Earning
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-xs">No Earnings</Badge>
                                                )
                                            ) : (
                                                canBeMonetized ? (
                                                     <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">
                                                        Eligible
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-xs">Not Eligible</Badge>
                                                )
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-xs">{views.toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-xs">{likes.toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-xs">{Object.keys(post.comments || {}).length.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-medium text-green-500 text-xs">
                                            {post.isCopyrighted ? (
                                                <div className="flex justify-end">
                                                    <Copyright className="h-4 w-4 text-destructive" />
                                                </div>
                                            ) : (
                                                `₹${revenue.toFixed(2)}`
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-xs">
                                            <Button variant="outline" size="sm" onClick={() => handleViewDetails(post)}>
                                                <Search className="h-3 w-3 mr-1" />
                                                Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    {userPosts.length > 3 && (
                        <div className="text-center mt-4">
                            <Button
                                variant="link"
                                onClick={() => setShowAllPosts(!showAllPosts)}
                            >
                                {showAllPosts ? 'View Less' : 'View More'}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {currentUser.isMonetized && withdrawalHistory.length > 0 && (
                 <Card>
                    <CardHeader className="p-4">
                        <div className="flex items-center gap-2">
                             <History className="h-5 w-5" />
                            <div>
                                <CardTitle className="text-xl">Withdrawal History</CardTitle>
                                <CardDescription className="text-xs">A log of all your past withdrawals.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-xs">Date</TableHead>
                                    <TableHead className="text-xs">Redeem Code</TableHead>
                                    <TableHead className="text-center text-xs">Status</TableHead>
                                    <TableHead className="text-right text-xs">Amount</TableHead>
                                    <TableHead className="text-right text-xs">Fee</TableHead>
                                    <TableHead className="text-right text-xs">Total Deducted</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {withdrawalHistory.map((withdrawal, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="text-xs">{format(new Date(withdrawal.timestamp), 'dd MMM yy, h:mm a')}</TableCell>
                                        <TableCell className="font-mono text-xs">
                                            <div className="flex items-center gap-2">
                                                {withdrawal.status === 'cleared' ? withdrawal.redeemCode : 'N/A'}
                                                {withdrawal.status === 'cleared' && withdrawal.redeemCode && (
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyCode(withdrawal.redeemCode)}>
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={withdrawal.status === 'cleared' ? 'default' : 'secondary'} className={withdrawal.status === 'cleared' ? 'bg-green-500' : 'bg-yellow-500'}>
                                                {withdrawal.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-xs">₹{withdrawal.amount.toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-destructive text-xs">₹{withdrawal.fee.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-bold text-xs">₹{withdrawal.totalDeducted.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
          </div>
        </main>
        <RightSidebar />
      </div>
    </div>
     {currentUser.isMonetized && (
        <WithdrawDialog
          isOpen={isWithdrawDialogOpen}
          onOpenChange={setIsWithdrawDialogOpen}
          currentUser={currentUser}
          availableBalance={availableBalance}
        />
      )}
      {selectedPost && (
        <PostDetailsDialog
          isOpen={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          post={selectedPost}
          currentUser={currentUser}
        />
      )}
    </>
  );
}

    

    

    

    

    