'use client';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { PostIcon } from './post-icon';
import type { Post, User } from './post-card';
import { formatDistanceToNow } from 'date-fns';
import { ThumbsUp, MessageSquare, Eye, DollarSign, BadgeCheck, Pencil, Check, X } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import { db } from '@/lib/firebase';
import { ref, update } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';

interface PostDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  post: Post;
  currentUser: User;
}

const formatCount = (count: number): string => {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    }
    if (count >= 1000) {
        return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return count.toString();
};


export function PostDetailsDialog({ isOpen, onOpenChange, post, currentUser }: PostDetailsDialogProps) {
    if (!post) return null;

    const { toast } = useToast();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post.content);
    const editCharLimit = 4000;

    useEffect(() => {
        setEditedContent(post.content);
    }, [post.content]);

    const likesCount = useMemo(() => Object.keys(post.likes || {}).length, [post.likes]);
    const commentsCount = useMemo(() => Object.keys(post.comments || {}).length, [post.comments]);
    const viewsCount = post.views || 0;

    let revenue = 0;
    if (post.user.isMonetized) {
      if (post.video) {
        revenue = (viewsCount / 1250) * 25;
      } else if (post.image) {
        revenue = (viewsCount / 1250) * 15;
      } else {
        revenue = (viewsCount / 1250) * 10;
      }
    }

    const charLimit = 800;
    const isLongPost = post.content.length > charLimit;
    const displayContent = isLongPost && !isExpanded ? `${post.content.substring(0, charLimit)}...` : post.content;

    const handleSaveEdit = async () => {
        if (!editedContent.trim()) return;
        try {
            const updates: { [key: string]: any } = {};
            updates[`/posts/${post.id}/content`] = editedContent;
            updates[`/private/${post.id}/content`] = editedContent;
            await update(ref(db), updates);
            setIsEditing(false);
            toast({ title: "Post updated successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update post content", variant: "destructive" });
        }
    };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            setIsExpanded(false);
            setIsEditing(false);
        }
        onOpenChange(open);
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle>Post Details</DialogTitle>
          {currentUser.id === post.user.id && !isEditing && (
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8">
                  <Pencil className="h-4 w-4" />
              </Button>
          )}
        </DialogHeader>
        <div className="space-y-4">
             <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={post.user.avatar} alt={post.user.name} />
                    <AvatarFallback>
                        {post.user.avatar ? post.user.name.charAt(0) : <PostIcon className="h-6 w-6" />}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center gap-1">
                        <p className="font-bold text-foreground">{post.user.name}</p>
                        {post.user.isMonetized && <BadgeCheck className="h-5 w-5 text-blue-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : 'just now'}
                    </p>
                </div>
            </div>

            <div>
              {isEditing ? (
                  <div className="space-y-2">
                      <div className="space-y-1">
                          <Textarea 
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="min-h-[120px] text-sm font-medium"
                            maxLength={editCharLimit}
                          />
                          <div className="text-[10px] text-muted-foreground text-right">
                              {editedContent.length} / {editCharLimit}
                          </div>
                      </div>
                      <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                              <X className="h-4 w-4 mr-1" /> Cancel
                          </Button>
                          <Button size="sm" onClick={handleSaveEdit}>
                              <Check className="h-4 w-4 mr-1" /> Save
                          </Button>
                      </div>
                  </div>
              ) : (
                  <>
                    {isLongPost && isExpanded ? (
                        <ScrollArea className="h-48 w-full rounded-md border p-3">
                        <p className="text-sm break-words whitespace-pre-wrap">{post.content}</p>
                        </ScrollArea>
                    ) : (
                        <>
                        <p className="text-sm break-words whitespace-pre-wrap">{displayContent}</p>
                        {isLongPost && !isExpanded && (
                            <Button variant="link" className="p-0 h-auto text-blue-500" onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}>
                            Read more
                            </Button>
                        )}
                        </>
                    )}
                  </>
              )}
            </div>

            {post.image && (
                <div className="relative w-full aspect-video bg-card rounded-md overflow-hidden">
                <Image 
                    src={post.image} 
                    alt="Post image" 
                    fill
                    className="object-cover"
                    data-ai-hint={post.imageHint}
                />
                </div>
            )}
            {post.video && (
                <div className="w-full bg-black rounded-md overflow-hidden">
                    <video
                        src={post.video}
                        controls
                        muted
                        className="w-full aspect-video"
                    />
                </div>
            )}

            <Separator />
            
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="flex flex-col items-center justify-center p-2 rounded-md bg-secondary">
                    <Eye className="h-5 w-5 mb-1 text-muted-foreground" />
                    <p className="font-bold text-lg">{formatCount(viewsCount)}</p>
                    <p className="text-xs text-muted-foreground">Views</p>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-md bg-secondary">
                    <ThumbsUp className="h-5 w-5 mb-1 text-muted-foreground" />
                    <p className="font-bold text-lg">{formatCount(likesCount)}</p>
                    <p className="text-xs text-muted-foreground">Likes</p>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-md bg-secondary">
                    <MessageSquare className="h-5 w-5 mb-1 text-muted-foreground" />
                    <p className="font-bold text-lg">{formatCount(commentsCount)}</p>
                    <p className="text-xs text-muted-foreground">Comments</p>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-md bg-secondary">
                    <DollarSign className="h-5 w-5 mb-1 text-green-500" />
                    <p className="font-bold text-lg text-green-500">₹{revenue.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
