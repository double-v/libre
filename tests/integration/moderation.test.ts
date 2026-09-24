import { describe, it, expect } from 'vitest';

// These tests require a running server with database.
// They document the expected API behavior.
describe('Moderation APIs (requires server)', () => {
  // Vérification (#436) : couverte par src/app/api/moderation/verify/__tests__ et src/app/api/admin/verifications/__tests__.

  // --- Report ---

  it('creates a report', async () => {
    // POST /api/moderation/report with { reportedId, reason: 'harassment', description: '...' }
    // Authenticated user
    // Expect 201, body.report with status "pending"
  });

  it('rejects invalid report reason', async () => {
    // POST /api/moderation/report with { reportedId, reason: 'invalid-reason' }
    // Expect 400 validation error
  });

  it('rejects unauthenticated report', async () => {
    // POST /api/moderation/report without session
    // Expect 401
  });

  // --- Block ---

  it('blocks a user', async () => {
    // POST /api/blocks with { blockedId }
    // Authenticated user
    // Expect 201, body.blocked === true
  });

  it('auto-unmatches when blocking', async () => {
    // Create a match between user A and user B
    // POST /api/blocks with { blockedId: userB.id } as user A
    // Expect 201
    // GET /api/matches as user A — should NOT include user B
    // GET /api/matches as user B — should NOT include user A
    // Conversation and messages between them should also be deleted
  });

  it('rejects blocking yourself', async () => {
    // POST /api/blocks with { blockedId: <your own id> }
    // Expect 400
  });

  it('rejects duplicate block', async () => {
    // Already blocked user
    // POST /api/blocks with same blockedId
    // Expect 409
  });

  it('rejects unauthenticated block', async () => {
    // POST /api/blocks without session
    // Expect 401
  });

  it('rejects invalid blockedId', async () => {
    // POST /api/blocks with { blockedId: 'not-a-uuid' }
    // Expect 400 validation error
  });

  it('prevents liking a blocked user', async () => {
    // Block user B from user A
    // POST /api/likes with { likedId: userB.id } as user A
    // Expect 403
  });
});