'use client';
import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface LivePostDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onCreateLive: (title: string, url: string) => void;
    postLimitReached: boolean;
}

const liveFormSchema = z.object({
  title: z.string().min(1, "Title is required.").max(100, "Title too long."),
  url: z.string().url("Invalid URL.").refine((url) => {
    return url.includes('youtube.com/live/') || url.includes('youtu.be/');
  }, {
    message: "Only YouTube Live URLs are accepted (e.g., youtube.com/live/ID)"
  }),
});

export function LivePostDialog({ isOpen, onOpenChange, onCreateLive, postLimitReached }: LivePostDialogProps) {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const form = useForm<z.infer<typeof liveFormSchema>>({
    resolver: zodResolver(liveFormSchema),
    defaultValues: {
      title: "",
      url: "",
    },
  });

  const urlValue = form.watch('url');

  useEffect(() => {
    setIsVerified(false);
  }, [urlValue]);

  const handleVerify = async () => {
    const isValid = await form.trigger('url');
    if (!isValid) return;

    setIsVerifying(true);
    // Simulate verification
    setTimeout(() => {
        setIsVerified(true);
        setIsVerifying(false);
        toast({
            title: "Live Stream Verified",
            description: "The YouTube Live URL is valid and ready to publish.",
        });
    }, 800);
  };

  const onSubmit = (values: z.infer<typeof liveFormSchema>) => {
    if (!isVerified) {
        handleVerify();
        return;
    }
    onCreateLive(values.title, values.url);
    onOpenChange(false);
    form.reset();
    setIsVerified(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            form.reset();
            setIsVerified(false);
        }
        onOpenChange(open);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Go Live</DialogTitle>
          <DialogDescription>
            Verify and share your YouTube Live stream with the community.
          </DialogDescription>
        </DialogHeader>

        {postLimitReached ? (
           <Alert variant="destructive">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Daily Post Limit Reached</AlertTitle>
             <AlertDescription>
                You can only create up to 2 posts per day.
             </AlertDescription>
           </Alert>
        ) : (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Stream Title</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter live title..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="url"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>YouTube Live URL</FormLabel>
                                <div className="flex gap-2">
                                    <FormControl>
                                        <Input 
                                            placeholder="https://www.youtube.com/live/..." 
                                            {...field} 
                                            className={cn(isVerified && "border-green-500 focus-visible:ring-green-500")}
                                        />
                                    </FormControl>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
                        {!isVerified ? (
                            <Button 
                                type="button" 
                                onClick={handleVerify} 
                                disabled={isVerifying || !urlValue}
                            >
                                {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify Stream"}
                            </Button>
                        ) : (
                            <Button type="submit">
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Publish Live
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}