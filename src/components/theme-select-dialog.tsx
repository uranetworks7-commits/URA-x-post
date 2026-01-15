
'use client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Sun, Moon } from 'lucide-react';

interface ThemeSelectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onThemeSelect: (theme: 'light' | 'dark') => void;
}

export function ThemeSelectDialog({
  isOpen,
  onOpenChange,
  onThemeSelect,
}: ThemeSelectDialogProps) {

  const handleSelect = (theme: 'light' | 'dark') => {
    onThemeSelect(theme);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Choose Your Theme</DialogTitle>
          <DialogDescription>
            Select your preferred interface theme. You can change this later in settings.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => handleSelect('light')}
          >
            <Sun className="h-8 w-8" />
            <span>Light Mode</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => handleSelect('dark')}
          >
            <Moon className="h-8 w-8" />
            <span>Dark Mode</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
