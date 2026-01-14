import { cn } from "@/lib/utils";

export function PostIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("h-8 w-8 text-primary", className)} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="80" height="80" rx="10" ry="10" stroke="currentColor" strokeWidth="8" fill="none" />
        <path d="M 30 30 L 70 70" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
        <path d="M 70 30 L 30 70" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}
