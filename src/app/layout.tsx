
'use client';
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

// No longer exporting metadata from here as theme is dynamic
// export const metadata: Metadata = {
//   title: 'POST-X',
//   description: 'A new social media experience',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Theme is now managed in HomePageContent or other page components
  // that have access to the user state. This layout is theme-agnostic.
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
