
'use client';
import { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Upload, Loader2, Link2 } from 'lucide-react';
import { uploadFile } from '@/lib/file-upload';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

interface MediaPostDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    mediaType?: 'image' | 'video';
    initialContent: string;
    onCreatePost: (content: string, url: string) => void;
    postLimitReached: boolean;
}

const charLimit = 4000;

const formSchema = z.object({
  content: z.string().min(1, { message: "Post content cannot be empty." }).max(charLimit, {message: `Post cannot exceed ${charLimit} characters.`}),
  mediaUrl: z.string().url({ message: "Please provide a valid URL." }),
});

export function MediaPostDialog({ 
    isOpen, 
    onOpenChange, 
    mediaType, 
    initialContent, 
    onCreatePost,
    postLimitReached
}: MediaPostDialogProps) {
    
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: initialContent,
      mediaUrl: "",
    },
  });
  
  const contentValue = form.watch('content');
  const mediaUrlValue = form.watch('mediaUrl');

  useEffect(() => {
    form.setValue('content', initialContent);
  }, [initialContent, form]);

  useEffect(() => {
    if (!isOpen) {
      form.reset({ content: initialContent, mediaUrl: '' });
    }
  }, [isOpen, form, initialContent]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileSizeLimit = 4.5 * 1024 * 1024; // 4.5 MB in bytes
    if (file.size > fileSizeLimit) {
        toast({
            title: "File is too large",
            description: "For files larger than 4.5 MB, please use the URL option.",
            variant: "destructive",
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        return;
    }

    setIsUploading(true);
    try {
        const url = await uploadFile(file);
        form.setValue('mediaUrl', url, { shouldValidate: true });
        toast({
            title: "Upload Successful",
            description: "Your file has been uploaded and the URL is ready.",
        });
    } catch (error) {
        toast({
            title: "Upload Failed",
            description: "Could not upload the file. Please try again.",
            variant: "destructive",
        });
        form.setValue('mediaUrl', '');
    } finally {
        setIsUploading(false);
    }
  };


  function onSubmit(values: z.infer<typeof formSchema>) {
    onCreatePost(values.content, values.mediaUrl);
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create {mediaType === 'image' ? 'Image' : 'Video'} Post</DialogTitle>
          <DialogDescription>
            Upload a file from your device or paste a direct URL to your media.
          </DialogDescription>
        </DialogHeader>

        {postLimitReached ? (
           <Alert variant="destructive">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Daily Post Limit Reached</AlertTitle>
             <AlertDescription>
                You can only create up to 2 posts per day. Please try again tomorrow.
             </AlertDescription>
           </Alert>
        ) : (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex justify-between items-center">
                                    <FormLabel>Post Content</FormLabel>
                                    <span className="text-xs text-muted-foreground">{contentValue.length} / {charLimit}</span>
                                </div>
                                <FormControl>
                                <Textarea placeholder="What's on your mind?" {...field} maxLength={charLimit} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <div className='space-y-4'>
                        <div>
                            <div className="flex justify-between items-center">
                                <FormLabel>From Your Device</FormLabel>
                                <span className="text-xs text-muted-foreground">Max 4.5 MB</span>
                            </div>
                            <Button 
                                type="button" 
                                variant="outline"
                                size="lg"
                                className="w-full mt-2"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading || !!mediaUrlValue}
                            >
                                {isUploading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                )}
                                {isUploading ? 'Uploading...' : `Upload ${mediaType}`}
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept={mediaType === 'image' ? 'image/*' : 'video/*'}
                                disabled={isUploading || !!mediaUrlValue}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                           <Separator className="flex-1" />
                           <span className="text-xs text-muted-foreground">OR</span>
                           <Separator className="flex-1" />
                        </div>
                         <FormField
                            control={form.control}
                            name="mediaUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>From a URL</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={`https://example.com/${mediaType}.png`}
                                            {...field}
                                            disabled={isUploading}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={!form.formState.isValid || isUploading}>
                            {isUploading ? 'Please wait...' : 'Post'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
