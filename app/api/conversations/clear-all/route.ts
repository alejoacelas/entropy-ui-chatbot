import { NextRequest, NextResponse } from 'next/server';
import { clearAllConversations } from '@/lib/conversation-storage';

export async function POST(req: NextRequest) {
  try {
    const { userId }: { userId: string } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Clear all conversations for the user
    const deletedCount = await clearAllConversations(userId);

    return NextResponse.json({
      success: true,
      deletedCount,
    });
  } catch (error) {
    console.error('Clear all conversations error:', error);
    return NextResponse.json(
      { error: 'Failed to clear conversations' },
      { status: 500 }
    );
  }
}
