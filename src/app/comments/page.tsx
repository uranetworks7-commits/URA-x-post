
'use client';
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from "firebase/database";
import type { Post, User, Comment } from '@/components/post-card';
import { Header } from '@/components/header';
import { RightSidebar } from '@/components/right-sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

// A lean version of the Comment with Post info for context
interface CommentWithContext extends Comment {
    postId: string;
    postContent: string;
}

export default function CommentsPage() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);
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
          setCurrentUser(userData);
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
          const postsList: Post[] = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setAllPosts(postsList);
        }
      });
    }
  }, [isClient]);

  const userPosts = useMemo(() => {
    if (!currentUser) return [];
    return allPosts.filter(post => post && post.user && post.user.id === currentUser.id);
  }, [allPosts, currentUser]);

  const commentsByMe = useMemo(() => {
    if (!currentUser) return [];
    const comments: CommentWithContext[] = [];
    allPosts.forEach(post => {
      if (post.comments) {
        Object.keys(post.comments).forEach(commentId => {
          const comment = { id: commentId, ...post.comments[commentId] };
          if (comment.user && comment.user.id === currentUser.id) {
            comments.push({
              ...comment,
              postId: post.id,
              postContent: post.content,
            });
          }
        });
      }
    });
    return comments.sort((a, b) => b.createdAt - a.createdAt);
  }, [allPosts, currentUser]);

  const commentsOnMyPosts = useMemo(() => {
    const comments: CommentWithContext[] = [];
    userPosts.forEach(post => {
      if (post.comments) {
        Object.keys(post.comments).forEach(commentId => {
          const comment = { id: commentId, ...post.comments[commentId] };
          comments.push({
            ...comment,
            postId: post.id,
            postContent: post.content,
          });
        });
      }
    });
    return comments.sort((a, b) => b.createdAt - a.createdAt);
  }, [userPosts]);

  if (!isClient || !currentUser) {
    return null; // Or a loading spinner
  }

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/');
  };

  return (
    <div className="flex flex-col h-screen">
      <Header 
        currentUser={currentUser}
        onLogout={handleLogout}
        onUpdateProfile={() => {}}
        userPosts={userPosts}
      />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          <Card>
            <CardHeader className="p-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                  <ArrowLeft className="h-5 w-5 text-yellow-500" />
                </Button>
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Your Comments
                  </CardTitle>
                  <CardDescription className="text-xs">Manage your conversations.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Tabs defaultValue="on-your-posts">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="on-your-posts" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-xs">Comments on Your Posts</TabsTrigger>
                  <TabsTrigger value="by-you" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-xs">Comments You've Made</TabsTrigger>
                </TabsList>
                <TabsContent value="on-your-posts" className="mt-4">
                    {commentsOnMyPosts.length > 0 ? (
                        <div className="space-y-4">
                            {commentsOnMyPosts.map(comment => (
                                <div key={comment.id} className="p-3 rounded-lg bg-secondary/50">
                                    <p className="text-xs text-muted-foreground mb-2">
                                      On post: <span className="italic">"{comment.postContent.substring(0, 50)}..."</span>
                                    </p>
                                    <div className="flex items-start gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={comment.user.avatar} />
                                            <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="font-bold">{comment.user.name}</span>
                                                <span className="text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                                            </div>
                                            <p className="text-xs">{comment.text}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">No one has commented on your posts yet.</p>
                        </div>
                    )}
                </TabsContent>
                 <TabsContent value="by-you" className="mt-4">
                    {commentsByMe.length > 0 ? (
                        <div className="space-y-4">
                            {commentsByMe.map(comment => (
                                <div key={comment.id} className="p-3 rounded-lg bg-secondary/50">
                                    <p className="text-xs text-muted-foreground mb-2">
                                      You commented on a post: <span className="italic">"{comment.postContent.substring(0, 50)}..."</span>
                                    </p>
                                    <div className="flex items-start gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={comment.user.avatar} />
                                            <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="font-bold">{comment.user.name} (You)</span>
                                                <span className="text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                                            </div>
                                            <p className="text-xs">{comment.text}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10">
                             <p className="text-muted-foreground">You haven't made any comments yet.</p>
                        </div>
                    )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}

    