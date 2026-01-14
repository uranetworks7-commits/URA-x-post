
'use client';
import { useState } from 'react';
import { Video, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import type { User } from './post-card';
import { PostIcon } from './ura-icon';
import { Progress } from './ui/progress';
import { MediaPostDialog } from './media-post-dialog';


interface CreatePostProps {
  onCreatePost: (content: string, mediaType?: 'image' | 'video', mediaUrl?: string) => void;
  currentUser: User;
  postCountToday: number;
}

export function CreatePost({ onCreatePost, currentUser, postCountToday }: CreatePostProps) {
  const [postContent, setPostContent] = useState('');
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | undefined>(undefined);

  const handlePost = () => {
    if (postContent.trim()) {
      onCreatePost(postContent);
      setPostContent('');
    }
  };

  const openMediaDialog = (type: 'image' | 'video') => {
    setMediaType(type);
    setIsMediaDialogOpen(true);
  }

  const handleMediaPost = (content: string, url: string) => {
    if (content.trim() && url.trim()) {
      onCreatePost(content, mediaType, url);
      setPostContent('');
    }
  };

  const postLimit = 2;

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar>
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback>
                  {currentUser.avatar ? currentUser.name.charAt(0) : <PostIcon className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
            <div className="w-full">
              <Textarea
                placeholder="What's on your mind?"
                className="bg-secondary border-none focus-visible:ring-0 text-base"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
              />
               <div className="mt-2 text-xs text-muted-foreground">
                  <p>Daily Post Limit: {postCountToday} / {postLimit}</p>
                  <Progress value={(postCountToday / postLimit) * 100} className="h-1 mt-1" />
               </div>
            </div>
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 gap-2">
                  <Video className="h-6 w-6 text-red-500" /> Live
              </Button>
              <Button variant="ghost" className="flex-1 gap-2" onClick={() => openMediaDialog('image')}>
                  <ImageIcon className="h-6 w-6 text-green-500" /> Photo
              </Button>
               <Button variant="ghost" className="flex-1 gap-2" onClick={() => openMediaDialog('video')}>
                  <Video className="h-6 w-6 text-blue-500" /> Video
              </Button>
            </div>
            <Button onClick={handlePost} disabled={!postContent.trim() || postCountToday >= postLimit}>
              Post
            </Button>
          </div>
        </CardContent>
      </Card>
      <MediaPostDialog 
        isOpen={isMediaDialogOpen}
        onOpenChange={setIsMediaDialogOpen}
        mediaType={mediaType}
        initialContent={postContent}
        onCreatePost={handleMediaPost}
        postLimitReached={postCountToday >= postLimit}
      />
    </>
  );
}
