import { NextRequest, NextResponse } from 'next/server';
import { UIMessage } from 'ai';
import { saveConversation } from '@/lib/conversation-storage';

// Rate limiting: Simple in-memory store (in production, use Redis)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW = 1000; // 1 second

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const lastSave = rateLimitMap.get(userId) || 0;

  if (now - lastSave < RATE_LIMIT_WINDOW) {
    return false;
  }

  rateLimitMap.set(userId, now);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const {
      conversationId,
      messages,
      contextMessages,
      userId,
    }: {
      conversationId: string | null;
      messages: UIMessage[];
      contextMessages?: Array<{ question: string; answer: string }>;
      userId: string;
    } = await req.json();

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Check rate limit
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before saving again.' },
        { status: 429 }
      );
    }

    // Validate message count (max 100 messages)
    if (messages.length > 100) {
      return NextResponse.json(
        { error: 'Conversation too long (max 100 messages)' },
        { status: 413 }
      );
    }

    // Validate conversationId format if provided
    if (conversationId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(conversationId)) {
        return NextResponse.json(
          { error: 'Invalid conversation ID format' },
          { status: 400 }
        );
      }
    }

    // Save conversation
    const newId = await saveConversation(userId, conversationId, messages, contextMessages);

    return NextResponse.json({
      conversationId: newId,
      success: true,
    });
  } catch (error) {
    console.error('Save conversation error:', error);

    // Check for quota exceeded error
    if (error instanceof Error && error.message.includes('quota')) {
      return NextResponse.json(
        { error: 'Storage quota exceeded. Please delete old conversations.' },
        { status: 507 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to save conversation' },
      { status: 500 }
    );
  }
}
