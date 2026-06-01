import { NextRequest, NextResponse } from 'next/server';
import { addSystemMessage } from '@/lib/square/store';

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET from Authorization header
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await addSystemMessage(
    '🧹 La Place sera réinitialisée dans 15 minutes. Profitez de vos derniers échanges !',
  );

  return NextResponse.json({ success: true });
}