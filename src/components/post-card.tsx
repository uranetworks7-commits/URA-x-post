
'use client';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Card, CardHeader, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { ThumbsUp, MessageSquare, Share2, DollarSign, Eye, MoreHorizontal, CheckCircle, Trash2, Send, ShieldAlert, BadgeCheck, PenSquare, Copyright, Copy, X, IndianRupee, UserPlus, ImageOff, VideoOff } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from './ui/separator';
import { PostIcon } from './post-icon';
import { Input } from './ui/input';
import { formatDistanceToNow } from 'date-fns';
import { ReportDialog } from './report-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { DeletePostDialog } from './delete-post-dialog';
import type { Post, User, Comment, Notification } from '@/lib/types';
import { Badge } from './ui/badge';
import { PostIdDialog } from './post-id-dialog';
import Link from 'next/link';
import { DeletePostConfirmDialog } from './delete-post-dialog-confirm';
import { db } from '@/lib/firebase';
import { ref, update, push, remove } from 'firebase/database';
import { ScrollArea } from './ui/scroll-area';
import { PostCommentsDialog } from './post-comments-dialog';


const parseCount = (count: number | undefined): number => {
    if (typeof count === 'number') return count;
    return 0;
};

const formatCount = (count: number): string => {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    }
    if (count >= 1000) {
        return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return count.toString();
};

// --- Add this new helper function here ---
const ALLOWED_IMAGE_HOSTS = [
  'placehold.co',
  'images.unsplash.com',
  'picsum.photos',
  'files.catbox.moe',
  'i.postimg.cc',
  'i.iib.co',
  'i.pravatar.cc',
  '9000-firebase-studio-1758432645286.cluster-c36dgv2kibakqwbbbsgmia3fny.cloudworkstations.dev'
];

const isImageHostAllowed = (imageUrl?: string): boolean => {
  if (!imageUrl) return false;
  try {
    const url = new URL(imageUrl);
    return ALLOWED_IMAGE_HOSTS.includes(url.hostname);
  } catch (error) {
    return false;
  }
};
// -----------------------------------------


export function PostCard({ post, currentUser, onDeletePost, onLikePost, onAddComment, onDeleteComment, onReportPost, onViewPost, onFollowUser, playingVideoId, onPlayVideo }: any) {
  // If post or post.user is missing, don't render the card.
  if (!post || !post.user) {
    return null;
  }
  
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPostIdDialogOpen, setIsPostIdDialogOpen] = useState(false);
  const [isUnfollowDialogOpen, setIsUnfollowDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const { toast } = useToast();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewCountedRef = useRef(false);
  const [showControls, setShowControls] = useState(false);

  const charLimit = 800;
  const isLongPost = post.content.length > charLimit;
  const displayContent = isLongPost && !isExpanded ? `${post.content.substring(0, charLimit)}...` : post.content;

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video && video.currentTime > 3 && !viewCountedRef.current) {
        onViewPost(post.id);
        viewCountedRef.current = true; // Mark as counted for this session
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
            onPlayVideo(post.id);
            video.play().catch(error => {
                console.warn("Autoplay with sound was prevented for video:", post.id, error);
            });
        } else {
            video.pause();
            video.currentTime = 0;
            viewCountedRef.current = false; // Reset when out of view
            setShowControls(false); // Hide controls when video scrolls out
        }
      },
      {
        threshold: 0.5,
      }
    );

    observer.observe(video);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      observer.disconnect();
      if (video) {
        video.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, [post.id, onPlayVideo, onViewPost]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
        if (playingVideoId !== post.id) {
            video.pause();
        }
    }
  }, [playingVideoId, post.id]);


  const handleDoubleClick = () => {
    if (videoRef.current) {
        setShowControls(prev => !prev);
    }
  };

  const [timeAgo, setTimeAgo] = useState(() => {
    if (!post.createdAt) return 'just now';
    const secondsSinceCreation = (Date.now() - post.createdAt) / 1000;
    if (secondsSinceCreation < 15) {
      return 'Publishing...';
    }
    try {
      return formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
    } catch (e) {
      return 'just now';
    }
  });

  useEffect(() => {
    if (!post.createdAt || typeof post.createdAt !== 'number') return;

    const updateDisplayTime = () => {
        if (post.createdAt) {
           try {
            setTimeAgo(formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }));
           } catch(e) {
            setTimeAgo('just now');
           }
        }
    };
    
    const secondsSinceCreation = (Date.now() - post.createdAt) / 1000;

    if (secondsSinceCreation < 15) {
      const timer = setTimeout(() => {
         updateDisplayTime();
      }, (15 - secondsSinceCreation) * 1000);
      return () => clearTimeout(timer);
    }
    
    updateDisplayTime();
    const interval = setInterval(updateDisplayTime, 15000); // Update every 15 seconds
    return () => clearInterval(interval);

  }, [post.createdAt]);

  
  const likesCount = useMemo(() => Object.keys(post.likes || {}).length, [post.likes]);
  const isLiked = useMemo(() => currentUser && post.likes && post.likes[currentUser.id], [currentUser, post.likes]);
  const isFollowing = useMemo(() => currentUser && currentUser.following && currentUser.following[post.user.id], [currentUser, post.user.id]);
  const isMutual = useMemo(() => {
      if (!currentUser || !post.user) return false;
      const iFollowThem = currentUser.following && currentUser.following[post.user.id];
      const theyFollowMe = post.user.following && post.user.following[currentUser.id];
      return iFollowThem && theyFollowMe;
  }, [currentUser, post.user]);


  const handleLike = () => {
    onLikePost(post.id, isMutual);
  };

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event
    if (isFollowing) {
        setIsUnfollowDialogOpen(true);
    } else {
        onFollowUser(post.user.id, post.user.name);
    }
  };

  const confirmUnfollow = () => {
    onFollowUser(post.user.id, post.user.name);
    setIsUnfollowDialogOpen(false);
  };
  
  const handleToggleComments = () => {
    setIsCommentsOpen(!isCommentsOpen);
  };

  const handleShare = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(postUrl).then(() => {
      toast({
        title: "Link Copied!",
        description: "The post link has been copied to your clipboard.",
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({
        title: "Failed to Copy",
        description: "Could not copy the link to your clipboard.",
        variant: "destructive",
      });
    });
  };

  const handleCodeReport = (code: string) => {
    if (code === '225') {
      onDeletePost(post.id);
      setIsReportDialogOpen(false);
      toast({
        title: "Post Reported and Deleted",
        description: "The post has been successfully reported and removed.",
      });
    } else {
      toast({
        title: "Invalid Code",
        description: "The report code you entered is incorrect.",
        variant: "destructive",
      });
    }
  };


  const isPublisher = post.user.id === currentUser.id;
  const viewsCount = parseCount(post.views);
  
  const isPostEligible = useMemo(() => viewsCount > 1000 && likesCount >= 10, [viewsCount, likesCount]);

  let revenue = 0;
  if (post.user.isMonetized && !post.isCopyrighted) {
      if(post.video) {
        revenue = (viewsCount / 1250) * 25;
      } else if (post.image) {
        revenue = (viewsCount / 1250) * 15;
      } else {
        revenue = (viewsCount / 1250) * 10;
      }
  }
  
  const sortedComments = useMemo(() => {
    if (!post.comments) return [];
    return Object.entries(post.comments)
      .map(([id, comment]: [string, any]) => ({ ...comment, id }))
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [post.comments]);

  const secondsSinceCreation = (Date.now() - (post.createdAt || Date.now())) / 1000;
  const isPublishing = secondsSinceCreation < 15;
  const showStats = secondsSinceCreation >= 60;
  
  const handleShowPostId = () => {
    setIsPostIdDialogOpen(true);
  };

  const canShowImage = isImageHostAllowed(post.image) && !imageError;

  return (
    <>
    <Card className={cn(post.isCopyrighted && "border-destructive/50")}>
      <CardHeader className="p-4">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${encodeURIComponent(post.user.id)}`}>
            <Avatar>
              <AvatarImage src={post.user.avatar} alt={post.user.name} />
              <AvatarFallback>
                  {post.user.avatar ? post.user.name.charAt(0) : <PostIcon className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Link href={`/profile/${encodeURIComponent(post.user.id)}`} className="font-bold text-sm text-foreground hover:underline">{post.user.name}</Link>
              {post.user.isMonetized && <BadgeCheck className="h-5 w-5 text-blue-500" />}
              {!isPublisher && (
                  <Button 
                    variant={isFollowing ? 'outline' : 'default'} 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={handleFollowClick}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{timeAgo}</p>
                {post.isCopyrighted && (
                    <Badge variant="destructive" className="text-xs">
                        <Copyright className="mr-1 h-3 w-3" />
                        Copyright
                    </Badge>
                )}
            </div>
          </div>
          <ReportDialog
            isOpen={isReportDialogOpen}
            onOpenChange={setIsReportDialogOpen}
            onTextReport={(reason: string) => onReportPost(post.id, reason)}
            onCodeReport={handleCodeReport}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Post Details</DropdownMenuLabel>
                 <DropdownMenuItem>
                   <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                   <span>Published</span>
                 </DropdownMenuItem>
                 {isPostEligible && (
                    <DropdownMenuItem className="text-blue-500">
                      <BadgeCheck className="mr-2 h-4 w-4" />
                      <span>Eligible for Monetization</span>
                    </DropdownMenuItem>
                 )}
                <DropdownMenuSeparator />
                 <DropdownMenuItem disabled>
                   <Eye className="mr-2 h-4 w-4" />
                   <span>{showStats ? `${formatCount(viewsCount)} Views` : 'Counting Views...'}</span>
                 </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  <span>{formatCount(likesCount)} Likes</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>{formatCount(sortedComments.length)} Comments</span>
                </DropdownMenuItem>
                 {isPublisher && post.user.isMonetized && (
                    <DropdownMenuItem disabled className={cn(showStats ? (post.isCopyrighted ? "text-destructive" : "text-green-500") : "text-muted-foreground")}>
                       <DollarSign className="mr-2 h-4 w-4" />
                       <span>{showStats ? (post.isCopyrighted ? 'No Revenue' : `₹${revenue.toFixed(2)} Revenue`) : 'Calculating Revenue...'}</span>
                    </DropdownMenuItem>
                 )}
                <DropdownMenuSeparator />
                {isPublisher && (
                   <DropdownMenuItem onClick={() => router.push('/analytics')}>
                    <PenSquare className="mr-2 h-4 w-4" />
                    <span>View Analytics</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={handleShowPostId}>
                    <Copy className="mr-2 h-4 w-4" />
                    <span>View Post ID</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isPublisher && (
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete Post</span>
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => setIsReportDialogOpen(true)} className="text-amber-500">
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  <span>Report Post</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ReportDialog>
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-2 cursor-pointer break-words" onClick={() => onViewPost(post.id)}>
        <p className="whitespace-pre-wrap">{displayContent}</p>
        {isLongPost && !isExpanded && (
          <Button variant="link" className="p-0 h-auto text-blue-500" onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}>
            Read more
          </Button>
        )}
      </CardContent>
      {post.image && (
        <div className="relative w-full aspect-video bg-card cursor-pointer" onClick={() => onViewPost(post.id)}>
          {canShowImage ? (
            <Image 
              src={post.image} 
              alt="Post image" 
              fill
              className="object-cover"
              data-ai-hint={post.imageHint}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground">
              <ImageOff className="h-10 w-10" />
            </div>
          )}
        </div>
      )}
       {post.video && (
          <div className="w-full bg-black cursor-pointer" onDoubleClick={handleDoubleClick}>
            {!videoError ? (
              <video
                  ref={videoRef}
                  src={post.video}
                  loop
                  playsInline
                  controls={showControls}
                  poster="https://i.postimg.cc/Z54t2P6S/20250927-145323.jpg"
                  className="w-full aspect-video object-contain"
                  preload="none"
                  onError={() => setVideoError(true)}
              />
            ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-secondary text-muted-foreground">
                    <VideoOff className="h-10 w-10" />
                </div>
            )}
          </div>
        )}
      <div className="flex justify-between items-center text-xs text-muted-foreground p-2 px-4">
        <div className="flex items-center gap-1">
          <ThumbsUp className="h-3 w-3 text-primary" />
          <span>{formatCount(likesCount)}</span>
        </div>
        <div className="flex gap-4">
          <button onClick={handleToggleComments} className="hover:underline">
            {formatCount(sortedComments.length)} Comments
          </button>
          {showStats && (
            <>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{formatCount(viewsCount)}</span>
                </div>
                {isPublisher && post.user.isMonetized && (
                  <div className="flex items-center gap-1">
                    {post.isCopyrighted ? (
                      <div className="relative text-destructive">
                          <IndianRupee className="h-4 w-4" />
                          <X className="absolute top-0 left-0 h-4 w-4" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-green-500">
                        <DollarSign className="h-4 w-4" />
                        <span>₹{revenue.toFixed(2)} Revenue</span>
                      </div>
                    )}
                  </div>
                )}
            </>
          )}
        </div>
      </div>
      <CardFooter className="p-0 border-t mx-4 flex-col items-start">
        <div className="flex justify-around w-full">
          <Button variant="ghost" className={cn("flex-1 gap-2 font-semibold", isLiked ? "text-primary" : "text-muted-foreground")} onClick={handleLike}>
            <ThumbsUp className="h-5 w-5" /> Like
          </Button>
          <Button variant="ghost" className="flex-1 gap-2 text-muted-foreground font-semibold" onClick={handleToggleComments}>
            <MessageSquare className="h-5 w-5" /> Comment
          </Button>
          <Button variant="ghost" className="flex-1 gap-2 text-muted-foreground font-semibold" onClick={handleShare}>
            <Share2 className="h-5 w-5" /> Share
          </Button>
        </div>
      </CardFooter>
    </Card>
    {isPublisher && (
      <DeletePostConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => onDeletePost(post.id)}
        title="Do you want to delete this Post?"
      />
    )}
    <PostIdDialog 
      isOpen={isPostIdDialogOpen}
      onOpenChange={setIsPostIdDialogOpen}
      postId={post.id}
    />
    <PostCommentsDialog
      isOpen={isCommentsOpen}
      onOpenChange={setIsCommentsOpen}
      post={post}
      currentUser={currentUser}
      onAddComment={onAddComment}
      onDeleteComment={onDeleteComment}
    />
    <DeletePostDialog
      isOpen={isUnfollowDialogOpen}
      onOpenChange={setIsUnfollowDialogOpen}
      onConfirm={confirmUnfollow}
    />
    </>
  );
}


