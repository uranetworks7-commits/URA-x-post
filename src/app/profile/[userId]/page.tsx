
'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, update, remove, set, push } from "firebase/database";
import type { Post, User, Comment, Notification } from '@/lib/types';
import { Header } from '@/components/header';
import { RightSidebar } from '@/components/right-sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PostCard } from '@/components/post-card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, Rss, Edit, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PostIcon } from '@/components/post-icon';
import { DeletePostDialog } from '@/components/delete-post-dialog';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage({ params }: { params: { userId: string } }) {
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isUnfollowDialogOpen, setIsUnfollowDialogOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { userId: encodedUserId } = params;
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [viewedPosts, setViewedPosts] = useState<string[]>([]);
  
  useEffect(() => {
    setIsClient(true);
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        const user = JSON.parse(savedUser);
        const userRef = ref(db, `users/${user.id}`);
        const listener = onValue(userRef, (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                setCurrentUser({ id: user.id, ...userData });
            }
        });

        const viewedPostsKey = `viewedPosts_${user.id}`;
        const storedViewedPosts = JSON.parse(localStorage.getItem(viewedPostsKey) || '[]');
        setViewedPosts(storedViewedPosts);

        return () => {
            // No-op, listener will be detached when component unmounts if needed
            // off(userRef, 'value', listener) is not the right syntax for new sdk
        }
    } else {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (!encodedUserId) return;
    
    const userId = decodeURIComponent(encodedUserId);

    const profileUserRef = ref(db, `users/${userId}`);
    const profileListener = onValue(profileUserRef, (snapshot) => {
      if (snapshot.exists()) {
        setProfileUser({ id: userId, ...snapshot.val() });
      }
    });

    const postsRef = ref(db, 'posts');
    const postsListener = onValue(postsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allPosts: Post[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        const filteredPosts = allPosts.filter(post => post.user && post.user.id === userId);
        setUserPosts(filteredPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      }
    });
    
    return () => {
        // Detach listeners
        // `onValue` returns an unsubscribe function
        profileListener();
        postsListener();
    }
  }, [encodedUserId]);

  const handleFollow = () => {
    if (!currentUser || !profileUser) return;
    const currentUserId = currentUser.id;
    const userIdToFollow = profileUser.id;

    const updates: { [key: string]: any } = {};
    const isCurrentlyFollowing = currentUser.following && currentUser.following[userIdToFollow];

    if (isCurrentlyFollowing) {
        // Trigger confirmation dialog for unfollow
        setIsUnfollowDialogOpen(true);
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

        update(ref(db), updates);
    }
  };

  const confirmUnfollow = () => {
    if (!currentUser || !profileUser) return;
    const currentUserId = currentUser.id;
    const userIdToFollow = profileUser.id;
    const updates: { [key: string]: any } = {};

    updates[`/users/${currentUserId}/following/${userIdToFollow}`] = null;
    updates[`/users/${userIdToFollow}/followers/${currentUserId}`] = null;
    update(ref(db), updates);
    setIsUnfollowDialogOpen(false);
  };
  
  const handleMessage = () => {
      if (!currentUser || !profileUser) return;
      const chatId = [currentUser.id, profileUser.id].sort().join('_');
      router.push(`/messages/${chatId}`);
  }
  
  const isFollowing = useMemo(() => {
      if (!currentUser || !profileUser) return false;
      return !!(currentUser.following && currentUser.following[profileUser.id]);
  }, [currentUser, profileUser]);

  const canMessage = useMemo(() => {
      if (!currentUser || !profileUser) return false;
      const theyFollowMe = !!(profileUser.following && profileUser.following[currentUser.id]);
      return isFollowing && theyFollowMe;
  }, [currentUser, profileUser, isFollowing]);

  const isMutual = useMemo(() => {
    if (!currentUser || !profileUser) return false;
    const iFollowThem = isFollowing;
    const theyFollowMe = !!(profileUser.following && profileUser.following[currentUser.id]);
    return iFollowThem && theyFollowMe;
  }, [currentUser, profileUser, isFollowing]);


  const handleLikePost = (postId: string) => {
    if (!currentUser) return;
    const postRef = ref(db, `posts/${postId}/likes/${currentUser.id}`);
    const post = userPosts.find(p => p.id === postId);

    if (post && post.likes && post.likes[currentUser.id]) {
      remove(postRef);
    } else {
      set(postRef, true);
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
  
  const handleDeletePost = (postId: string) => {
      if (!currentUser || currentUser.id !== profileUser?.id) return;
      const postRef = ref(db, `posts/${postId}`);
      remove(postRef);
      toast({
          title: "Post Deleted",
          description: "Your post has been successfully removed.",
      });
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

  const handleViewPost = (postId: string) => {
    if (!currentUser || !isClient) return;

    const viewedPostsKey = `viewedPosts_${currentUser.id}`;
    let currentViewedPosts: string[] = JSON.parse(localStorage.getItem(viewedPostsKey) || '[]');

    if (!currentViewedPosts.includes(postId)) {
      const postRef = ref(db, `posts/${postId}`);
      const post = userPosts.find(p => p.id === postId);
      if (post) {
        const currentViews = post.views || 0;
        update(postRef, { views: currentViews + 1 });
        
        currentViewedPosts.push(postId);
        setViewedPosts(currentViewedPosts);
        localStorage.setItem(viewedPostsKey, JSON.stringify(currentViewedPosts));
      }
    }
  };


  if (!isClient || !currentUser || !profileUser) {
    return null; // or a loading spinner
  }

  const isOwnProfile = currentUser.id === profileUser.id;
  const followersCount = profileUser.followers ? Object.keys(profileUser.followers).length : 0;
  const followingCount = profileUser.following ? Object.keys(profileUser.following).length : 0;


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
          <Card>
            <CardHeader className="p-2">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={profileUser.avatar} />
                        <AvatarFallback>{profileUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold">{profileUser.name}</h2>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                            <span><span className="font-bold text-foreground">{followersCount}</span> Followers</span>
                            <span><span className="font-bold text-foreground">{followingCount}</span> Following</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 mt-2">
                   {!isOwnProfile && (
                     <>
                        <Button size="sm" className="flex-1" variant={isFollowing ? "outline" : "default"} onClick={handleFollow}>
                            <Rss className="mr-2 h-4 w-4" /> {isFollowing ? 'Following' : 'Follow'}
                        </Button>
                        <Button size="sm" className="flex-1" disabled={!canMessage} onClick={handleMessage}>
                            <MessageSquare className="mr-2 h-4 w-4" /> Message
                        </Button>
                     </>
                   )}
                   {isOwnProfile && (
                       <Button size="sm" variant="outline" className="flex-1">
                           <Edit className="mr-2 h-4 w-4" /> Edit Profile
                       </Button>
                   )}
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-3 text-green-500">
                    <FileText className="h-4 w-4"/>
                    Posts
                </h3>
                <div className="space-y-4">
                {userPosts.length > 0 ? userPosts.map(post => (
                    <PostCard 
                        key={post.id} 
                        post={post} 
                        currentUser={currentUser}
                        onLikePost={handleLikePost}
                        onAddComment={handleAddComment}
                        onDeleteComment={handleDeleteComment}
                        onDeletePost={handleDeletePost}
                        onReportPost={handleReportPost}
                        onViewPost={handleViewPost}
                        onFollowUser={handleFollow}
                        playingVideoId={playingVideoId}
                        onPlayVideo={setPlayingVideoId}
                    />
                )) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>{profileUser.name} hasn't posted anything yet.</p>
                    </div>
                )}
                </div>
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
