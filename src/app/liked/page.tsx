
'use client';
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, set, push, remove, update } from "firebase/database";
import type { Post, User, Comment } from '@/lib/types';
import { Header } from '@/components/header';
import { RightSidebar } from '@/components/right-sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PostCard } from '@/components/post-card';
import { ArrowLeft, ThumbsUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function LikedPostsPage() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [viewedPosts, setViewedPosts] = useState<string[]>([]);

  useEffect(() => {
    setIsClient(true);
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      const userRef = ref(db, `users/${user.id}`);
      onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
          setCurrentUser({id: user.id, ...userData});
        }
      });

      const viewedPostsKey = `viewedPosts_${user.id}`;
      const storedViewedPosts = JSON.parse(localStorage.getItem(viewedPostsKey) || '[]');
      setViewedPosts(storedViewedPosts);

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
          const postsList: Post[] = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setAllPosts(postsList);
        }
      });
    }
  }, [isClient]);

  const likedPosts = useMemo(() => {
    if (!currentUser) return [];
    return allPosts.filter(post => post && post.likes && post.likes[currentUser.id]);
  }, [allPosts, currentUser]);
  
  const userPosts = useMemo(() => {
    if (!currentUser) return [];
    return allPosts.filter(post => post && post.user && post.user.id === currentUser.id);
  }, [allPosts, currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/');
  };

  const handleUpdateProfile = (name: string, avatarUrl: string) => {
    // This can be implemented if needed, but for now we keep it simple
  };

  const handleDeletePost = () => {};

  const handleLikePost = (postId: string) => {
    if (!currentUser) return;
    const postRef = ref(db, `posts/${postId}/likes/${currentUser.id}`);
    // On this page, the main action is to unlike
    remove(postRef);
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
  
  const handleReportPost = () => {};
  
  const handleViewPost = (postId: string) => {
    if (!currentUser || !isClient) return;

    const viewedPostsKey = `viewedPosts_${currentUser.id}`;
    let currentViewedPosts: string[] = JSON.parse(localStorage.getItem(viewedPostsKey) || '[]');

    if (!currentViewedPosts.includes(postId)) {
      const postRef = ref(db, `posts/${postId}`);
      const post = allPosts.find(p => p.id === postId);
      if (post) {
        const currentViews = post.views || 0;
        update(postRef, { views: currentViews + 1 });
        
        currentViewedPosts.push(postId);
        localStorage.setItem(viewedPostsKey, JSON.stringify(currentViewedPosts));
      }
    }
  };

  const handleFollowUser = () => {};

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
      />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          <Card>
            <CardHeader className="p-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <ThumbsUp className="h-5 w-5 text-primary" />
                    Liked Posts
                  </CardTitle>
                  <CardDescription className="text-xs">Posts you have liked.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {likedPosts.length > 0 ? (
                <div className="space-y-4">
                  {likedPosts.map((post) => (
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
                      showUnlikeIcon={true}
                      playingVideoId={playingVideoId}
                      onPlayVideo={setPlayingVideoId}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">You haven't liked any posts yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}
