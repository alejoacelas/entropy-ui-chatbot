import { UIMessage } from 'ai';

export interface ConversationMetadata {
  id: string;              // UUID for this conversation
  userId: string;          // Owner
  title: string;           // First user message (truncated to 50 chars)
  createdAt: number;       // Timestamp (ms)
  updatedAt: number;       // Timestamp (ms)
  messageCount: number;    // Total messages
  previewText: string;     // Full first message for display
}

export interface StoredConversation {
  metadata: ConversationMetadata;
  messages: UIMessage[];   // From @ai-sdk/react
  contextMessages?: Array<{ question: string; answer: string }>; // From questionnaire
}

export interface UserConversationIndex {
  userId: string;
  conversations: ConversationMetadata[];  // Sorted by updatedAt DESC
  lastModified: number;
}
