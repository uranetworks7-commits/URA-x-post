'use client';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import type { User } from './post-card';
import { Switch } from './ui/switch';
import { db } from '@/lib/firebase';
import { ref, update } from 'firebase/database';


interface ProfileSettingsDialogProps {
  currentUser: User;
  onUpdateProfile: (name: string, avatarUrl: string) => void;
  children: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  theme: string;
  setTheme: (theme: 'light' | 'dark') => void;
}

export function ProfileSettingsDialog({
  currentUser,
  onUpdateProfile,
  children,
  isOpen,
  onOpenChange,
  theme,
  setTheme
}: ProfileSettingsDialogProps) {
  const [name, setName] = useState(currentUser.name);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar);

  useEffect(() => {
    setName(currentUser.name);
    setAvatarUrl(currentUser.avatar);
  }, [currentUser]);

  const handleSave = () => {
    onUpdateProfile(name, avatarUrl);
    onOpenChange(false);
  };
  
  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? 'dark' : 'light';
    setTheme(newTheme);
    // Also update in Firebase
    if (currentUser) {
      update(ref(db, `users/${currentUser.id}`), { theme: newTheme });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
          <DialogDescription>
            Update your profile and application settings.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="avatarUrl" className="text-right">
              Avatar URL
            </Label>
            <Input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="col-span-3"
              placeholder="https://example.com/image.png"
            />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="theme" className="text-right">
              Theme
            </Label>
            <div className="col-span-3 flex items-center space-x-2">
                <Label htmlFor="theme-switch">Light</Label>
                <Switch
                    id="theme-switch"
                    checked={theme === 'dark'}
                    onCheckedChange={handleThemeChange}
                />
                <Label htmlFor="theme-switch">Dark</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
