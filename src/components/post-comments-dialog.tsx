'use client';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Send, MoreHorizontal, Trash2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import type { Post, User, Comment } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { DeletePostConfirmDialog } from './delete-post-dialog-confirm';

interface PostCommentsDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    post: Post;
    currentUser: User;
    onAddComment: (postId: string, commentText: string) => void;
    onDeleteComment: (postId: string, commentId: string) => void;
}

function CommentOptionsMenu({ comment, post, currentUser, onDelete }: { comment: Comment; post: Post; currentUser: User; onDelete: () => void }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const canDelete = currentUser.id === post.user.id || currentUser.id === comment.user.id;

  if (!canDelete) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeletePostConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={onDelete}
        title="Are you sure you want to delete this comment?"
      />
    </>
  );
}

export function PostCommentsDialog({
    isOpen,
    onOpenChange,
    post,
    currentUser,
    onAddComment,
    onDeleteComment
}: PostCommentsDialogProps) {
    const [commentText, setCommentText] = useState('');

    const sortedComments = useMemo(() => {
        if (!post.comments) return [];
        return Object.entries(post.comments)
            .map(([id, comment]: [string, any]) => ({ ...comment, id }))
            .sort((a, b) => a.createdAt - b.createdAt);
    }, [post.comments]);

    const handleCommentSubmit = () => {
        if (commentText.trim()) {
            onAddComment(post.id, commentText);
            setCommentText('');
        }
    };
    
    if (!post) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg flex flex-col h-[80vh] sm:h-[70vh]">
                <DialogHeader>
                    <DialogTitle>Comments on {post.user.name}'s post</DialogTitle>
                    <DialogDescription>
                        {sortedComments.length} {sortedComments.length === 1 ? 'comment' : 'comments'}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full pr-4">
                        <div className="space-y-4">
                            {sortedComments.length > 0 ? (
                                sortedComments.map((comment: Comment) => (
                                    <div key={comment.id} className="flex items-start gap-3 text-sm">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={comment.user.avatar} />
                                            <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="bg-secondary rounded-lg p-3 flex-1">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold">{comment.user.name}</p>
                                                    <p className="text-muted-foreground text-xs">
                                                        {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : 'just now'}
                                                    </p>
                                                </div>
                                                <CommentOptionsMenu 
                                                    comment={comment}
                                                    post={post}
                                                    currentUser={currentUser}
                                                    onDelete={() => onDeleteComment(post.id, comment.id)}
                                                />
                                            </div>
                                            <p className="mt-1">{comment.text}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-sm text-muted-foreground py-10">
                                    Be the first to comment.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={currentUser.avatar} />
                        <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Input
                        placeholder="Write a comment..."
                        className="bg-secondary border-none focus-visible:ring-0"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
                    />
                    <Button size="icon" onClick={handleCommentSubmit} disabled={!commentText.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
