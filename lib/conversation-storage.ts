import { UIMessage } from 'ai';
import { StorageFactory } from '@/storage';
import {
  ConversationMetadata,
  StoredConversation,
  UserConversationIndex,
} from '@/types/conversation';

const storage = StorageFactory.getStorage();

/**
 * Generates a title from the first user message
 */
function generateTitle(messages: UIMessage[]): { title: string; previewText: string } {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  const textPart = firstUserMessage?.parts?.find((p) => p.type === 'text');
  const fullText = textPart?.text || 'New conversation';

  const title = fullText.substring(0, 50) + (fullText.length > 50 ? '...' : '');

  return { title, previewText: fullText };
}

/**
 * Gets the conversation storage path for a user
 */
function getConversationPath(userId: string, conversationId: string): string {
  return `conversations/users/${userId}/conversations/${conversationId}.json`;
}

/**
 * Gets the index storage path for a user
 */
function getIndexPath(userId: string): string {
  return `conversations/users/${userId}/index.json`;
}

/**
 * Loads the user's conversation index
 */
export async function loadUserIndex(userId: string): Promise<UserConversationIndex | null> {
  try {
    const index = await storage.load<UserConversationIndex>(getIndexPath(userId));
    return index;
  } catch (error) {
    console.error('Failed to load user index:', error);
    return null;
  }
}

/**
 * Updates the user's conversation index with a conversation's metadata
 */
export async function updateUserIndex(
  userId: string,
  metadata: ConversationMetadata,
  isNew: boolean
): Promise<void> {
  try {
    let index = await loadUserIndex(userId);

    if (!index) {
      // Create new index if it doesn't exist
      index = {
        userId,
        conversations: [],
        lastModified: Date.now(),
      };
    }

    if (isNew) {
      // Add new conversation to the beginning
      index.conversations.unshift(metadata);
    } else {
      // Update existing conversation
      const existingIndex = index.conversations.findIndex((c) => c.id === metadata.id);
      if (existingIndex !== -1) {
        index.conversations[existingIndex] = metadata;
        // Move to front (most recently updated)
        const [updated] = index.conversations.splice(existingIndex, 1);
        index.conversations.unshift(updated);
      } else {
        // Conversation not found in index, add it
        index.conversations.unshift(metadata);
      }
    }

    index.lastModified = Date.now();

    await storage.save(getIndexPath(userId), index);
  } catch (error) {
    console.error('Failed to update user index:', error);
    throw error;
  }
}

/**
 * Removes a conversation from the user's index
 */
export async function removeFromIndex(userId: string, conversationId: string): Promise<void> {
  try {
    const index = await loadUserIndex(userId);

    if (!index) {
      return;
    }

    index.conversations = index.conversations.filter((c) => c.id !== conversationId);
    index.lastModified = Date.now();

    await storage.save(getIndexPath(userId), index);
  } catch (error) {
    console.error('Failed to remove conversation from index:', error);
    throw error;
  }
}

/**
 * Saves a conversation to storage
 */
export async function saveConversation(
  userId: string,
  conversationId: string | null,
  messages: UIMessage[],
  contextMessages?: Array<{ question: string; answer: string }>
): Promise<string> {
  try {
    // Determine if this is a new conversation
    const isNew = !conversationId;
    const id = conversationId || crypto.randomUUID();

    // Get existing createdAt timestamp if updating
    let createdAt = Date.now();
    if (!isNew) {
      const existing = await storage.load<StoredConversation>(getConversationPath(userId, id));
      if (existing) {
        createdAt = existing.metadata.createdAt;
      }
    }

    // Generate title from first user message
    const { title, previewText } = generateTitle(messages);

    // Build metadata
    const metadata: ConversationMetadata = {
      id,
      userId,
      title,
      createdAt,
      updatedAt: Date.now(),
      messageCount: messages.length,
      previewText,
    };

    // Build full conversation object
    const conversation: StoredConversation = {
      metadata,
      messages,
      contextMessages,
    };

    // Save conversation file
    await storage.save(getConversationPath(userId, id), conversation);

    // Update index
    await updateUserIndex(userId, metadata, isNew);

    return id;
  } catch (error) {
    console.error('Failed to save conversation:', error);
    throw error;
  }
}

/**
 * Loads a conversation from storage
 */
export async function loadConversation(
  userId: string,
  conversationId: string
): Promise<StoredConversation | null> {
  try {
    const conversation = await storage.load<StoredConversation>(
      getConversationPath(userId, conversationId)
    );

    // Validate ownership
    if (conversation && conversation.metadata.userId !== userId) {
      console.error('Conversation ownership mismatch');
      return null;
    }

    return conversation;
  } catch (error) {
    console.error('Failed to load conversation:', error);
    return null;
  }
}

/**
 * Deletes a conversation from storage
 */
export async function deleteConversation(userId: string, conversationId: string): Promise<void> {
  try {
    // Validate ownership before deleting
    const conversation = await loadConversation(userId, conversationId);

    if (!conversation) {
      throw new Error('Conversation not found or unauthorized');
    }

    // Delete the conversation file
    await storage.delete(getConversationPath(userId, conversationId));

    // Remove from index
    await removeFromIndex(userId, conversationId);
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    throw error;
  }
}

/**
 * Deletes all conversations for a user
 */
export async function clearAllConversations(userId: string): Promise<number> {
  try {
    const index = await loadUserIndex(userId);

    if (!index) {
      return 0;
    }

    const count = index.conversations.length;

    // Delete all conversation files
    for (const conv of index.conversations) {
      try {
        await storage.delete(getConversationPath(userId, conv.id));
      } catch (error) {
        console.error(`Failed to delete conversation ${conv.id}:`, error);
        // Continue deleting other conversations
      }
    }

    // Clear the index
    await storage.save(getIndexPath(userId), {
      userId,
      conversations: [],
      lastModified: Date.now(),
    });

    return count;
  } catch (error) {
    console.error('Failed to clear all conversations:', error);
    throw error;
  }
}
