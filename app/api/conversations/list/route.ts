import { NextRequest, NextResponse } from 'next/server';
import { loadUserIndex } from '@/lib/conversation-storage';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { conversations: [], total: 0 },
        { status: 200 }
      );
    }

    // Load user's conversation index
    const index = await loadUserIndex(userId);

    if (!index) {
      return NextResponse.json(
        { conversations: [], total: 0 },
        { status: 200 }
      );
    }

    return NextResponse.json({
      conversations: index.conversations,
      total: index.conversations.length,
    });
  } catch (error) {
    console.error('List conversations error:', error);
    return NextResponse.json(
      { error: 'Failed to list conversations' },
      { status: 500 }
    );
  }
}
