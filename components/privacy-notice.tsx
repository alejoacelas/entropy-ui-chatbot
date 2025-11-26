'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PrivacyNoticeProps {
  onAccept: () => void;
}

export function PrivacyNotice({ onAccept }: PrivacyNoticeProps) {
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onAccept();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAccept]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <div className="animate-in fade-in duration-300">
          <CardHeader className="space-y-4 pb-6 text-center">
            <CardTitle className="text-3xl font-semibold">Welcome to Aerin</CardTitle>
            <CardDescription className="text-lg leading-relaxed pt-4">
              By default, we log your conversations to improve Aerin and provide better assistance.
            </CardDescription>
            <CardDescription className="text-lg leading-relaxed pt-2">
              You can disable conversation logging at any time using the <strong>Config dropdown</strong> in the chat interface.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pb-8">
            <Button
              size="lg"
              className="h-12 text-base"
              onClick={onAccept}
              onKeyDown={(e) => e.key === 'Enter' && onAccept()}
            >
              I understand <span className="text-xs opacity-70 ml-2">Enter ↵</span>
            </Button>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
