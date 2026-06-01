import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getTodayThemeConfig } from '@/lib/square/themes-server';
import { addSystemMessage, broadcastReset } from '@/lib/square/store';

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET from Authorization header
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Delete all reactions and messages
  const deletedReactions = await getDb().squareReaction.deleteMany({});
  const deletedMessages = await getDb().squareMessage.deleteMany({});

  // Delete resolved/dismissed reports (keep pending ones)
  await getDb().squareMessageReport.deleteMany({
    where: { status: { not: 'pending' } },
  });

  // Create a system welcome message with today's theme label
  const theme = await getTodayThemeConfig();
  await addSystemMessage(`🗳️ Bienvenue sur La Place ! Aujourd'hui : ${theme.label}. ${theme.description}`);

  // Broadcast reset to all connected clients
  broadcastReset();

  return NextResponse.json({
    success: true,
    deletedMessages: deletedMessages.count,
    deletedReactions: deletedReactions.count,
  });
}