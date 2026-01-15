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
import { AlertCircle, Upload, Loader2, Link2, CheckCircle } from 'lucide-react';
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

const isSupportedHost = (url: string) => {
    try {
        const parsedUrl = new URL(url);
        const supportedHosts = [
            'files.catbox.moe',
            'i.postimg.cc',
            // Add other direct link hosts here
        ];
        return supportedHosts.some(host => parsedUrl.hostname.endsWith(host));
    } catch (e) {
        return false;
    }
};

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
  const [isUrlVerified, setIsUrlVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      content: initialContent,
      mediaUrl: "",
    },
  });
  
  const contentValue = form.watch('content');
  const mediaUrlValue = form.watch('mediaUrl');
  
  // Reset verification status if URL changes
  useEffect(() => {
    setIsUrlVerified(false);
  }, [mediaUrlValue]);


  useEffect(() => {
    form.setValue('content', initialContent);
  }, [initialContent, form]);

  useEffect(() => {
    if (!isOpen) {
      form.reset({ content: initialContent, mediaUrl: '' });
      setIsUrlVerified(false);
      setIsVerifying(false);
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
        setIsUrlVerified(true); // Uploaded files are implicitly verified
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

  const handleVerifyUrl = async () => {
     setIsVerifying(true);
     const url = form.getValues('mediaUrl');
     
     // Quick check for basic URL structure
     const isZodValid = await form.trigger('mediaUrl');
     if (!isZodValid) {
         setIsVerifying(false);
         return;
     }

     if (!isSupportedHost(url)) {
        form.setError('mediaUrl', {
            type: 'manual',
            message: 'URL is not from a supported host. Use direct media links.'
        });
        setIsUrlVerified(false);
     } else {
        // Here you could add a HEAD request to see if URL is reachable
        // For now, hostname check is enough to prevent most crashes.
        setIsUrlVerified(true);
        toast({
            title: "URL Verified",
            description: "The provided media link is valid.",
        });
     }
     setIsVerifying(false);
  };


  function onSubmit(values: z.infer<typeof formSchema>) {
    onCreatePost(values.content, values.mediaUrl);
    onOpenChange(false);
  }

  const handlePrimaryAction = () => {
    if (isUrlVerified) {
        form.handleSubmit(onSubmit)();
    } else {
        handleVerifyUrl();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create {mediaType === 'image' ? 'Image' : 'Video'} Post</DialogTitle>
          <DialogDescription>
            Upload a file or provide a verified URL for your media.
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
                                    <div className="flex gap-2">
                                        <FormControl>
                                            <Input
                                                placeholder={`https://example.com/${mediaType}.png`}
                                                {...field}
                                                disabled={isUploading}
                                                className={cn(isUrlVerified && "border-green-500 focus-visible:ring-green-500")}
                                            />
                                        </FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="button" onClick={handlePrimaryAction} disabled={isUploading || isVerifying || (!!mediaUrlValue && !form.formState.isValid)}>
                            {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isUrlVerified ? 'Post' : 'Verify Post'}
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
