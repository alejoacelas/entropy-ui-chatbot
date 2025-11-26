'use client';

import { useState, useEffect } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { PlusIcon, TrashIcon, Loader2Icon } from 'lucide-react';
import { ConversationMetadata } from '@/types/conversation';
import { getUserId } from '@/lib/user-id';

interface ConversationHistorySidebarProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onClearAll: () => void;
}

export function ConversationHistorySidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onClearAll,
}: ConversationHistorySidebarProps) {
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    setLoading(true);
    try {
      const userId = getUserId();
      if (!userId) {
        setConversations([]);
        return;
      }

      const response = await fetch('/api/conversations/list', {
        headers: { 'x-user-id': userId },
      });
      const { conversations } = await response.json();
      setConversations(conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await onDeleteConversation(id);
      // Refresh the list after deletion
      await loadConversations();
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    try {
      await onClearAll();
      // Refresh the list after clearing
      await loadConversations();
    } catch (error) {
      console.error('Failed to clear conversations:', error);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <Button onClick={onNewConversation} className="w-full" size="lg">
          <PlusIcon className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recent Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center space-y-2">
                <p>Your conversations will appear here</p>
                <p className="text-xs">Start chatting to create your first conversation</p>
              </div>
            ) : (
              <SidebarMenu>
                {conversations.map((conv) => (
                  <SidebarMenuItem key={conv.id}>
                    <div className="flex items-center gap-2 w-full">
                      <SidebarMenuButton
                        onClick={() => onSelectConversation(conv.id)}
                        isActive={conv.id === currentConversationId}
                        className="flex-1 justify-start"
                        tooltip={conv.previewText}
                      >
                        <div className="flex flex-col items-start flex-1 min-w-0">
                          <span className="font-medium truncate w-full text-left">
                            {conv.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(conv.updatedAt)}
                          </span>
                        </div>
                      </SidebarMenuButton>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => handleDelete(e, conv.id)}
                        className="h-8 w-8 shrink-0"
                        disabled={deletingId === conv.id}
                      >
                        {deletingId === conv.id ? (
                          <Loader2Icon className="h-4 w-4 animate-spin" />
                        ) : (
                          <TrashIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <Button
          variant="ghost"
          onClick={handleClearAll}
          className="w-full"
          disabled={conversations.length === 0}
        >
          <TrashIcon className="mr-2 h-4 w-4" />
          Clear All History
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
