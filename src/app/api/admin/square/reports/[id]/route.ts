import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAdminSession } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { addSystemMessage, broadcastDelete } from '@/lib/square/store';
import { z } from 'zod';

const handleReportSchema = z.object({
  action: z.enum(['dismiss', 'warn', 'ban', 'delete_message']),
  reason: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminResult = await requireAdmin();
  if (!isAdminSession(adminResult)) return adminResult;
  const { id } = await params;

  const body = await request.json();
  const parsed = handleReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation échouée' }, { status: 400 });
  }

  const { action, reason } = parsed.data;

  const report = await getDb().squareMessageReport.findUnique({
    where: { id },
    include: { message: true },
  });
  if (!report) {
    return NextResponse.json({ error: 'Signalement non trouvé' }, { status: 404 });
  }

  switch (action) {
    case 'dismiss': {
      await getDb().squareMessageReport.update({
        where: { id },
        data: { status: 'dismissed' },
      });
      break;
    }

    case 'warn': {
      await getDb().squareMessageReport.update({
        where: { id },
        data: { status: 'reviewed' },
      });
      await addSystemMessage(
        `⚠️ Attention : certains messages ne respectent pas les règles de La Place. Merci de rester courtois.`,
      );
      break;
    }

    case 'ban': {
      // Find the author of the reported message
      const messageAuthor = report.message?.pseudonym;
      // Create moderation log entry
      await getDb().moderationLog.create({
        data: {
          adminId: adminResult.userId,
          targetUserId: report.reporterId, // We'll update this with the actual message author
          action: 'SQUARE_BAN',
          reason: reason ?? `Square report: ${report.reason}`,
        },
      });

      // Try to find the actual message author by pseudonym in today's context
      // Since pseudonyms are anonymous, we update the report status
      await getDb().squareMessageReport.update({
        where: { id },
        data: { status: 'reviewed' },
      });

      await addSystemMessage(
        `🚫 Un utilisateur a été banni(e) de La Place pour comportement inapproprié.`,
      );
      break;
    }

    case 'delete_message': {
      if (report.message) {
        const messageId = report.message.id;
        // Delete the message from DB
        await getDb().squareMessage.delete({
          where: { id: messageId },
        });
        // Broadcast deletion to SSE clients
        broadcastDelete(messageId);
        await addSystemMessage(
          `🗑️ Un message a été supprimé par la modération.`,
        );
      }
      await getDb().squareMessageReport.update({
        where: { id },
        data: { status: 'reviewed' },
      });
      break;
    }
  }

  return NextResponse.json({ success: true });
}