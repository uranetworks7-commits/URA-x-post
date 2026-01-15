

'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, set, push, remove, update, query, orderByChild, equalTo, get } from "firebase/database";
import { LeftSidebar } from '@/components/left-sidebar';
import { RightSidebar } from '@/components/right-sidebar';
import { PostCard, Post, User, Comment } from '@/components/post-card';
import { CreatePost } from '@/components/create-post';
import { Header } from '@/components/header';
import { LoginPage } from '@/components/login-page';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { PostIcon } from '@/components/post-icon';
import { FilterDropdown, SortType } from '@/components/filter-dropdown';
import { Notification } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { TriangleAlert, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';


const initialPosts: Omit<Post, 'id' | 'createdAt'>[] = [
    {
    user: { id: 'user-1', name: 'POST Studio', avatar: `https://placehold.co/150x150/222/fff?text=P`, isMonetized: false, totalViews: 0, totalLikes: 0 },
    content: 'Welcome to the new POST-X platform! This is the beginning of something amazing. We are building a community-focused social network.',
    image: 'https://picsum.photos/seed/1/800/600',
    imageHint: 'abstract tech',
    likes: {},
    comments: {},
    views: 1200,
  },
  {
    user: { id: 'user-2', name: 'Dev Team', avatar: `https://placehold.co/150x150/222/fff?text=D`, isMonetized: false, totalViews: 0, totalLikes: 0 },
    content: 'Just pushed a major update! The feed now looks cleaner and loads faster. Let us know what you think of the new design. #webdev #react #nextjs',
    image: 'https://picsum.photos/seed/2/800/500',
    imageHint: 'coding computer',
    likes: {},
    comments: {},
    views: 876,
  },
  {
    user: { id: 'user-publisher', name: 'Original Publisher', avatar: `https://placehold.co/150x150/222/fff?text=O`, isMonetized: true, totalViews: 0, totalLikes: 0 },
    content: 'Having fun building this new social app. What feature should I add next? Here is a post where I should be able to see revenue.',
    image: 'https://picsum.photos/seed/sub/800/600',
    imageHint: 'developer coding',
    likes: { 'user-2': true, 'user-1': true },
    comments: {},
    views: 1500,
  },
];

function LoadingScreen() {
    return (
        <div className="fixed inset-0 bg-background flex items-center justify-center z-[100]">
            <div className="flex flex-col items-center gap-4">
                 <svg className="x-loader h-24 w-24 text-primary" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <rect className="box" x="10" y="10" width="80" height="80" rx="10" ry="10" stroke="currentColor" strokeWidth="6" fill="none" />
                    <path className="x-line-1" d="M 30 30 L 70 70" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                    <path className="x-line-2" d="M 70 30 L 30 70" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                </svg>
                <h1 className="text-3xl font-bold text-primary animate-pulse">POST-X</h1>
            </div>
        </div>
    )
}

function TerminatedScreen({ onLogout }: { onLogout: () => void }) {
    return (
        <div className="fixed inset-0 bg-background flex items-center justify-center z-[100]">
            <Alert variant="destructive" className="max-w-md">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Account Terminated</AlertTitle>
                <AlertDescription>
                    Your account has been terminated due to multiple copyright violations.
                    <Button onClick={onLogout} variant="secondary" size="sm" className="mt-4 w-full">
                        <LogOut className="mr-2 h-4 w-4" /> Log Out
                    </Button>
                </AlertDescription>
            </Alert>
        </div>
    );
}

const getISTDateString = () => {
    const date = new Date();
    // IST is UTC+5:30
    const offset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + offset);
    return istDate.toISOString().split('T')[0];
};

function HomePageContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewedPosts, setViewedPosts] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortType>('feed');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    setIsClient(true);
    const timer = setTimeout(() => setIsLoading(false), 2000); // Simulate loading for 2 seconds
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    if (isClient) {
      const savedUserString = localStorage.getItem('currentUser');
      if (savedUserString) {
        const savedUser = JSON.parse(savedUserString);
        
        const userRef = ref(db, `users/${savedUser.id}`);
        const listener = onValue(userRef, (snapshot) => {
            const userDataFromDb = snapshot.val();
            
            if (!userDataFromDb) {
                toast({
                    title: "Account Not Found",
                    description: "Your account may have been removed. Logging you out.",
                    variant: "destructive",
                });
                handleLogout();
                return;
            }
            
            if (userDataFromDb.isLocked) {
                 setCurrentUser({ id: savedUser.id, ...userDataFromDb }); // Update state to show terminated screen
                 return;
            }


            if (userDataFromDb.mainAccountUsername !== savedUser.mainAccountUsername) {
                toast({
                    title: "Account Details Changed",
                    description: "Your main account details have changed. Please log in again.",
                    variant: "destructive",
                });
                handleLogout();
                return;
            }
            
            // Only update state and local storage if there's a material difference
            const userWithId = { id: savedUser.id, ...userDataFromDb };
            if (JSON.stringify(userWithId) !== JSON.stringify(currentUser)) {
               setCurrentUser(userWithId);
               localStorage.setItem('currentUser', JSON.stringify(userWithId));
            }
        });
        
        const viewedPostsKey = `viewedPosts_${savedUser.id}`;
        const storedViewedPosts = JSON.parse(localStorage.getItem(viewedPostsKey) || '[]');
        setViewedPosts(storedViewedPosts);

      }

      const postsRef = ref(db, 'posts');
      onValue(postsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const postsList: Post[] = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setPosts(postsList);
        } else {
          // Seed the database if it's empty
          initialPosts.forEach((post) => {
            const newPostRef = push(ref(db, 'posts'));
            const postWithTimestamp: Omit<Post, 'id'> = {
              ...post,
              createdAt: Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 3), // random post from last 3 days
            };
            set(newPostRef, postWithTimestamp);
          });
        }
      });
    }
  }, [isClient, handleLogout, currentUser]);

    // Handle copyright strike expiration
    useEffect(() => {
        if (!currentUser) return;

        const now = Date.now();
        const userRef = ref(db, `users/${currentUser.id}`);
        const updates: { [key: string]: any } = {};
        let hasChanges = false;
        
        const activeStrikes = currentUser.copyrightStrikes 
            ? Object.values(currentUser.copyrightStrikes).filter(s => s.status === 'active')
            : [];

        if (activeStrikes.length >= 3) {
            // With 3 strikes, they don't expire. No action needed here.
        } else if (currentUser.copyrightStrikes) {
            Object.entries(currentUser.copyrightStrikes).forEach(([key, strike]) => {
                if (strike.status === 'active' && now > strike.expiresAt) {
                    const newStatus = 'expired';
                    updates[`copyrightStrikes/${strike.strikeId}/status`] = newStatus;
                    hasChanges = true;

                    // Create notification for expired strike
                    const notifRef = push(ref(db, `users/${currentUser.id}/notifications`));
                    const newNotification: Notification = {
                        id: notifRef.key!,
                        type: 'COPYRIGHT_STRIKE_UPDATE',
                        message: `A copyright strike from ${strike.claimantName} has expired.`,
                        link: '/copyright',
                        timestamp: Date.now(),
                        isRead: false,
                    };
                    updates[`notifications/${notifRef.key}`] = newNotification;
                }
            });
        }

        if (hasChanges) {
            update(userRef, updates);
        }

    }, [currentUser]);


  // Reset daily post count if the day has changed (IST)
    useEffect(() => {
        if (currentUser) {
            const todayIST = getISTDateString();
            const lastPostDate = currentUser.dailyPostCount?.date;

            if (lastPostDate !== todayIST) {
                const userRef = ref(db, `users/${currentUser.id}`);
                update(userRef, {
                    dailyPostCount: {
                        count: 0,
                        date: todayIST,
                    }
                });
            }
        }
    }, [currentUser]);


  // Update user stats periodically
    useEffect(() => {
        if (!currentUser || posts.length === 0) return;

        const interval = setInterval(() => {
            const userPosts = posts.filter(p => p.user && p.user.id === currentUser.id);
            const totalViews = userPosts.reduce((acc, post) => acc + (post.views || 0), 0);
            const totalLikes = userPosts.reduce((acc, post) => acc + Object.keys(post.likes || {}).length, 0);
            
            const userRef = ref(db, `users/${currentUser.id}`);
            const updates: Partial<User> = {};

            if (totalViews !== currentUser.totalViews) {
                updates.totalViews = totalViews;
            }
            if (totalLikes !== currentUser.totalLikes) {
                updates.totalLikes = totalLikes;
            }
            
            if (Object.keys(updates).length > 0) {
                update(userRef, updates);
            }

        }, 1000 * 30); // Update every 30 seconds

        return () => clearInterval(interval);

    }, [posts, currentUser]);
  
    // New stage-based view simulation
    useEffect(() => {
        if (!isClient || posts.length === 0) return;

        const intervalTime = 5000; 
        const interval = setInterval(() => {
            const now = Date.now();
            posts.forEach(post => {
                if (!post.user) return; // Safety check
                if (post.viewStage && post.stageAssignedAt && post.targetViews && post.targetCompletedIn) {
                    const durationMs = post.targetCompletedIn * 60 * 60 * 1000;
                    const elapsedMs = now - post.stageAssignedAt;
                    const currentViews = post.views || 0;

                    if (elapsedMs < durationMs) {
                        // Growth phase
                        const progress = elapsedMs / durationMs;
                        const expectedViews = Math.floor(progress * post.targetViews);
                        
                        if (currentViews < expectedViews) {
                             update(ref(db, `posts/${post.id}`), { views: Math.min(expectedViews, post.targetViews) });
                        }

                    } else {
                        // "Dead" phase after target time is completed
                        if (currentViews < post.targetViews) {
                             // Final update to ensure target is met
                             update(ref(db, `posts/${post.id}`), { views: post.targetViews });
                        } else if (!post.finalViewBoostApplied) {
                            // One-time final boost
                            const finalViews = currentViews + Math.floor(Math.random() * 2) + 2; // 2-3 views
                            update(ref(db, `posts/${post.id}`), { 
                                views: finalViews,
                                finalViewBoostApplied: true 
                            });
                        }
                    }
                }
            });
        }, intervalTime);

        return () => clearInterval(interval);
    }, [isClient, posts]);

  const handleCreatePost = (content: string, mediaType?: 'image' | 'video', mediaUrl?: string) => {
    if (!currentUser) return;
    
    const today = getISTDateString();
    const userPostCount = currentUser.dailyPostCount?.date === today ? currentUser.dailyPostCount.count : 0;

    if (userPostCount >= 2) {
        toast({
            title: "Post Limit Reached",
            description: "You can only create up to 2 posts per day.",
            variant: "destructive",
        });
        return;
    }

    let viewStage: 'A' | 'B' | 'C' | 'D' | 'E';
    let targetViews: number;
    const rand = Math.random();

    if (rand < 0.04) { // 4% for Stage E
        viewStage = 'E'; // Viral
        targetViews = Math.floor(Math.random() * (1500 - 150 + 1)) + 150;
    } else if (rand < 0.22) { // 18% for Stage D (4 + 18 = 22)
        viewStage = 'D';
        targetViews = Math.floor(Math.random() * (150 - 78 + 1)) + 78;
    } else if (rand < 0.37) { // 15% for Stage B (22 + 15 = 37)
        viewStage = 'B';
        targetViews = Math.floor(Math.random() * (28 - 10 + 1)) + 10;
    } else if (rand < 0.47) { // 10% for Stage A (37 + 10 = 47)
        viewStage = 'A';
        targetViews = Math.floor(Math.random() * 5) + 1;
    } else { // 53% for Stage C (the rest)
        viewStage = 'C';
        targetViews = Math.floor(Math.random() * (78 - 28 + 1)) + 28;
    }

    const newPostData: Omit<Post, 'id'> = {
      user: currentUser,
      content,
      likes: {},
      comments: {},
      views: 0,
      createdAt: Date.now(),
      viewStage,
      targetViews,
      stageAssignedAt: Date.now(),
      targetCompletedIn: Math.floor(Math.random() * 48) + 1, // Random duration from 1 to 48 hours
    };

    if (mediaType === 'image' && mediaUrl) {
      (newPostData as any).image = mediaUrl;
    } else if (mediaType === 'video' && mediaUrl) {
      (newPostData as any).video = mediaUrl;
    }
    
    const newPostRef = push(ref(db, 'posts'));
    set(newPostRef, newPostData);

    const userRef = ref(db, `users/${currentUser.id}`);
    update(userRef, {
        dailyPostCount: {
            count: userPostCount + 1,
            date: today,
        }
    });
  };
  
  const handleDeletePost = (postId: string) => {
    if (!currentUser) return;

    const postToDelete = posts.find(p => p.id === postId);
    if (!postToDelete) return;

    // Decrement stats
    const viewsLost = postToDelete.views || 0;
    const likesLost = Object.keys(postToDelete.likes || {}).length;
    
    const userRef = ref(db, `users/${currentUser.id}`);
    const updates: any = { // Use 'any' to dynamically add properties
        totalViews: Math.max(0, (currentUser.totalViews || 0) - viewsLost),
        totalLikes: Math.max(0, (currentUser.totalLikes || 0) - likesLost),
    };

    // Decrement daily post count if the post was created today
    const today = getISTDateString();
    const postCreationDate = new Date(postToDelete.createdAt).toISOString().split('T')[0]; // This can stay UTC as it's a past date
    const postCreationDateIST = new Date(new Date(postToDelete.createdAt).getTime() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (postCreationDateIST === today && currentUser.dailyPostCount?.date === today) {
        updates['dailyPostCount/count'] = Math.max(0, currentUser.dailyPostCount.count - 1);
    }

    update(userRef, updates);


    // Remove post from DB
    const postRef = ref(db, `posts/${postId}`);
    remove(postRef);
  };
  
  const handleReportPost = (postId: string, reason: string) => {
    const reportsRef = ref(db, `reports/${postId}`);
    const newReportRef = push(reportsRef);
    set(newReportRef, {
      reason,
      reportedBy: currentUser?.id,
      timestamp: Date.now(),
    });
    toast({
      title: "Post Reported",
      description: "Thank you for your feedback. We will review this post.",
    });
  };

  const handleLikePost = (postId: string, isMutual: boolean) => {
    if (!currentUser) return;
    const postRef = ref(db, `posts/${postId}/likes/${currentUser.id}`);
    const post = posts.find(p => p.id === postId);
    if (post && post.likes && post.likes[currentUser.id]) {
      // Unlike
      remove(postRef);
    } else {
      // Like
      set(postRef, true);
      // Create notification for post author (if not the current user and they are mutuals)
      if (post && post.user.id !== currentUser.id && isMutual) {
          const notifRef = push(ref(db, `users/${post.user.id}/notifications`));
          const newNotification: Notification = {
              id: notifRef.key!,
              type: 'POST_LIKE',
              message: `${currentUser.name} liked your post.`,
              link: `/post/${post.id}`,
              timestamp: Date.now(),
              isRead: false,
              relatedUserId: currentUser.id,
              relatedPostId: post.id,
              relatedPostContent: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
          };
          update(ref(db), { [`/users/${post.user.id}/notifications/${notifRef.key}`]: newNotification });
      }
    }
  };

  const handleFollowUser = (userIdToFollow: string, userNameToFollow: string) => {
    if (!currentUser) return;
    const currentUserId = currentUser.id;

    const updates: { [key: string]: any } = {};
    const isCurrentlyFollowing = currentUser.following && currentUser.following[userIdToFollow];

    if (isCurrentlyFollowing) {
        // Unfollow
        updates[`/users/${currentUserId}/following/${userIdToFollow}`] = null;
        updates[`/users/${userIdToFollow}/followers/${currentUserId}`] = null;
    } else {
        // Follow
        updates[`/users/${currentUserId}/following/${userIdToFollow}`] = true;
        updates[`/users/${userIdToFollow}/followers/${currentUserId}`] = true;

        // Create notification for the user being followed
        const notifRef = push(ref(db, `users/${userIdToFollow}/notifications`));
        const newNotification: Notification = {
            id: notifRef.key!,
            type: 'NEW_FOLLOWER',
            message: `${currentUser.name} started following you.`,
            link: `/profile/${encodeURIComponent(currentUser.id)}`,
            timestamp: Date.now(),
            isRead: false,
            relatedUserId: currentUser.id,
        };
        updates[`/users/${userIdToFollow}/notifications/${notifRef.key}`] = newNotification;
    }
    update(ref(db), updates);
};

  const handleAddComment = (postId: string, commentText: string) => {
    if (!currentUser) return;
    const commentsRef = ref(db, `posts/${postId}/comments`);
    const newCommentRef = push(commentsRef);
    const newComment: Omit<Comment, 'id'> = {
      user: currentUser,
      text: commentText,
      createdAt: Date.now(),
    };
    set(newCommentRef, newComment);
  };
  
  const handleDeleteComment = (postId: string, commentId: string) => {
    if (!currentUser) return;
    const commentRef = ref(db, `posts/${postId}/comments/${commentId}`);
    remove(commentRef);
  };

  const handleViewPost = (postId: string) => {
    if (!currentUser || !isClient) return;

    const viewedPostsKey = `viewedPosts_${currentUser.id}`;
    let currentViewedPosts: string[] = JSON.parse(localStorage.getItem(viewedPostsKey) || '[]');

    if (!currentViewedPosts.includes(postId)) {
      const postRef = ref(db, `posts/${postId}`);
      const post = posts.find(p => p.id === postId);
      if (post) {
        const currentViews = post.views || 0;
        update(postRef, { views: currentViews + 1 });
        
        currentViewedPosts.push(postId);
        localStorage.setItem(viewedPostsKey, JSON.stringify(currentViewedPosts));
        // We do not call setViewedPosts here to keep the feed stable during the session.
        // The state will be updated on the next page load.
      }
    }
  };


  const handleUpdateProfile = (name: string, avatarUrl: string) => {
    if (!currentUser) return;

    const updates: { [key: string]: any } = {};
    updates[`/users/${currentUser.id}/name`] = name;
    updates[`/users/${currentUser.id}/avatar`] = avatarUrl;
    
    posts.forEach(post => {
      if (post.user && post.user.id === currentUser.id) {
        updates[`/posts/${post.id}/user/name`] = name;
        updates[`/posts/${post.id}/user/avatar`] = avatarUrl;
      }
    });

    update(ref(db), updates);
    
    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated.",
    });
  };

 const handleLogin = async (name: string, mainAccountUsername: string) => {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
        const usersData = snapshot.val();
        let foundUser = null;
        let foundUserId = null;

        // Iterate over all users to find a match
        for (const userId in usersData) {
            const user = usersData[userId];
            
            if(user.isLocked) {
                continue; // Skip terminated accounts
            }

            if (mainAccountUsername && user.mainAccountUsername === mainAccountUsername) {
                // If a main account username is provided, we prioritize it.
                // If a chat name is also provided, we make sure it matches.
                if (name && user.name !== name) {
                    continue; // Skip if chat name doesn't match
                }
                foundUser = user;
                foundUserId = userId;
                break;
            } else if (name && !mainAccountUsername && user.name === name) {
                // Login with only chat name if main account is not provided
                foundUser = user;
                foundUserId = userId;
                break;
            }
        }
        
        if (foundUser && foundUserId) {
            const userToLogin = { id: foundUserId, ...foundUser };
            localStorage.setItem('currentUser', JSON.stringify(userToLogin));
            setCurrentUser(userToLogin);
        } else {
             toast({
                title: "Login Failed",
                description: "No account found with the provided credentials, or the account is terminated. Please check your details and try again.",
                variant: "destructive",
            });
        }
    } else {
         toast({
            title: "Login Failed",
            description: "No users found in the database.",
            variant: "destructive",
        });
    }
  };
  
  const userPosts = useMemo(() => {
    if (!currentUser) return [];
    return posts.filter(post => post.user && post.user.id === currentUser.id);
  }, [posts, currentUser]);

  const filteredPosts = useMemo(() => {
    let sortedPosts = [...posts];

    // 1. Search filter
    if (searchQuery) {
        sortedPosts = sortedPosts.filter(post =>
            post.user && post.user.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // 2. Sorting logic
    switch (sortBy) {
        case 'popular':
            sortedPosts.sort((a, b) => {
                const aPopularity = (a.views || 0) + Object.keys(a.likes || {}).length * 5;
                const bPopularity = (b.views || 0) + Object.keys(b.likes || {}).length * 5;
                return bPopularity - aPopularity;
            });
            break;
        case 'old':
            sortedPosts.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            break;
        case 'feed':
        case 'newest':
        default:
             sortedPosts.sort((a, b) => {
                const aIsViewed = viewedPosts.includes(a.id);
                const bIsViewed = viewedPosts.includes(b.id);
                if (aIsViewed === bIsViewed) {
                    return (b.createdAt || 0) - (a.createdAt || 0); // Both viewed or both not viewed, sort by newest
                }
                return aIsViewed ? 1 : -1; // Unviewed posts first
            });
            break;
    }

    return sortedPosts;
}, [posts, searchQuery, sortBy, viewedPosts]);


  if (!isClient || isLoading) {
    return <LoadingScreen />; 
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }
  
  if (currentUser.isLocked) {
      return <TerminatedScreen onLogout={handleLogout} />;
  }
  
  const today = getISTDateString();
  const postCountToday = currentUser.dailyPostCount?.date === today ? currentUser.dailyPostCount.count : 0;


  return (
    <div className="flex flex-col h-screen">
      <Header 
        currentUser={currentUser}
        onLogout={handleLogout}
        onUpdateProfile={handleUpdateProfile}
        userPosts={userPosts}
      />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar 
            currentUser={currentUser} 
            onLogout={handleLogout}
            onUpdateProfile={handleUpdateProfile}
            userPosts={userPosts}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <CreatePost 
                onCreatePost={handleCreatePost} 
                currentUser={currentUser}
                postCountToday={postCountToday}
            />
            <div className="relative my-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search users..." 
                className="pl-8 pr-10 w-full bg-card" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <FilterDropdown value={sortBy} onValueChange={setSortBy} />
            </div>
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <PostCard 
                    key={post.id} 
                    post={post} 
                    currentUser={currentUser}
                    onDeletePost={handleDeletePost}
                    onLikePost={handleLikePost}
                    onAddComment={handleAddComment}
                    onDeleteComment={handleDeleteComment}
                    onReportPost={handleReportPost}
                    onViewPost={handleViewPost}
                    onFollowUser={handleFollowUser}
                    playingVideoId={playingVideoId}
                    onPlayVideo={setPlayingVideoId}
                />
              ))}
            </div>
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}


export default function HomePage() {
  return (
      <HomePageContent />
  );
}
