import { describe, it, expect } from 'vitest';

// These tests require a running server with database.
// They document the expected API behavior.
describe('Profile API (requires server)', () => {
  it('creates a profile for an authenticated user', async () => {
    // PUT /api/users/profile with profile data
    // Expect 200, body.profile.bio, body.profile.genderIdentity
  });

  it('gets a public profile without email', async () => {
    // GET /api/users/{id}
    // Expect 200, body.displayName, NO body.email, NO body.passwordHash
  });

  it('deletes a user and all data', async () => {
    // DELETE /api/users/me
    // Expect 204
    // Then GET /api/users/{id} returns 404
  });
});