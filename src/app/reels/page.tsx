
'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, set, push, remove, update } from "firebase/database";
import { PostCard, Post, User, Comment } from '@/components/post-card';
import { Header } from '@/components/header';
import { useToast } from "@/hooks/use-toast";
import { Notification } from '@/lib/types';
import { ArrowLeft, Clapperboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function ReelsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const router = useRouter();


  useEffect(() => {
    setIsClient(true);
    const savedUserString = localStorage.getItem('currentUser');
    if (savedUserString) {
      const savedUser = JSON.parse(savedUserString);
      const userRef = ref(db, `users/${savedUser.id}`);
      onValue(userRef, (snapshot) => {
        const userDataFromDb = snapshot.val();
        if (userDataFromDb) {
          setCurrentUser({ id: savedUser.id, ...userDataFromDb });
        }
      });
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
      }
    });
  }, []);

  const handleLikePost = (postId: string, isMutual: boolean) => {
    if (!currentUser) return;
    const postRef = ref(db, `posts/${postId}/likes/${currentUser.id}`);
    const post = posts.find(p => p.id === postId);
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

  const handleFollowUser = (userIdToFollow: string, userNameToFollow: string) => {
    if (!currentUser) return;
    const currentUserId = currentUser.id;
    const updates: { [key: string]: any } = {};
    const isCurrentlyFollowing = currentUser.following && currentUser.following[userIdToFollow];
    if (isCurrentlyFollowing) {
      updates[`/users/${currentUserId}/following/${userIdToFollow}`] = null;
      updates[`/users/${userIdToFollow}/followers/${currentUserId}`] = null;
    } else {
      updates[`/users/${currentUserId}/following/${userIdToFollow}`] = true;
      updates[`/users/${userIdToFollow}/followers/${currentUserId}`] = true;
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
  
  const handleDeletePost = () => {};
  const onReportPost = () => {};
  const onViewPost = () => {};


  if (!isClient || !currentUser) {
    return null; // Or a loading spinner
  }

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center relative">
        <div className="absolute top-4 left-4 z-20">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="bg-black/50 hover:bg-black/70">
                <ArrowLeft className="h-5 w-5 text-white" />
            </Button>
        </div>
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 text-white font-bold">
            <Clapperboard />
            <span>Reels</span>
        </div>
      <div className="h-full w-full max-w-md mx-auto overflow-y-auto scroll-snap-y scroll-snap-mandatory">
        {posts.map((post) => (
          <div key={post.id} className="h-full w-full flex-shrink-0 snap-start flex items-center justify-center relative">
            <div className="w-full h-[90vh] my-auto">
                 <PostCard 
                    post={post} 
                    currentUser={currentUser}
                    onDeletePost={handleDeletePost}
                    onLikePost={handleLikePost}
                    onAddComment={handleAddComment}
                    onDeleteComment={handleDeleteComment}
                    onReportPost={onReportPost}
                    onViewPost={onViewPost}
                    onFollowUser={handleFollowUser}
                    playingVideoId={playingVideoId}
                    onPlayVideo={setPlayingVideoId}
                />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
