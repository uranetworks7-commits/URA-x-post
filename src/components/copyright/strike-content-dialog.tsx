
'use client';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CopyrightStrike } from '@/lib/types';
import { Badge } from '../ui/badge';
import { FileWarning } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PostIcon } from '../post-icon';
import { formatDistanceToNow } from 'date-fns';

interface StrikeContentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  strike: CopyrightStrike;
}

export function StrikeContentDialog({ isOpen, onOpenChange, strike }: StrikeContentDialogProps) {
  if (!strike) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Copyrighted Content</DialogTitle>
          <DialogDescription>
            This is the content associated with the strike you received from {strike.claimantName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Avatar>
                {/* Since the original user might be deleted, we can't rely on their data. 
                    Let's use a generic fallback. The claimant's name is what matters here. */}
                <AvatarFallback>
                    <PostIcon className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-bold text-foreground">Original Post Content</p>
                <p className="text-xs text-muted-foreground">
                    Strike received on {formatDistanceToNow(new Date(strike.receivedAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            
            <p className="text-sm bg-secondary p-3 rounded-md break-words">
                {strike.postContent}
            </p>

            {strike.imageUrl && (
                <div className="relative w-full aspect-video bg-card rounded-md overflow-hidden">
                <Image 
                    src={strike.imageUrl} 
                    alt="Copyrighted image" 
                    fill
                    className="object-cover"
                />
                </div>
            )}
            {strike.videoUrl && (
                <div className="w-full bg-black rounded-md overflow-hidden">
                    <video
                        src={strike.videoUrl}
                        controls
                        muted
                        className="w-full aspect-video"
                    />
                </div>
            )}

            {!strike.imageUrl && !strike.videoUrl && (
                 <div className="text-center py-6 text-muted-foreground">
                    <FileWarning className="mx-auto h-8 w-8 mb-2" />
                    <p>No media was attached to this strike.</p>
                </div>
            )}
            <Badge variant="destructive" className="w-full justify-center">This content was removed from the platform.</Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
}
