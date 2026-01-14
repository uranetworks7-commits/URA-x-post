
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PostIcon } from './post-icon';

interface LoginPageProps {
  onLogin: (name: string, mainAccountUsername: string) => void;
}

const formSchema = z.object({
  name: z.string().optional(),
  mainAccountUsername: z.string().optional(),
}).refine(data => data.name || data.mainAccountUsername, {
    message: "Either Main Account Username or Chat Name must be filled in.",
    path: ["mainAccountUsername"], 
});


export function LoginPage({ onLogin }: LoginPageProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      mainAccountUsername: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onLogin(values.name || '', values.mainAccountUsername || '');
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
                <PostIcon className="h-10 w-10" />
                 <h1 className="text-3xl font-bold text-primary">POST-X</h1>
            </div>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to log in</CardDescription>
        </CardHeader>
        <CardContent>
           <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="mainAccountUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                        <span className="text-red-500">Main Account</span> Username
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. MainAccount" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Chat Name <span className="text-yellow-500">(optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. JohnDoe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">Login</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
