import { describe, it, expect } from 'vitest';

// These tests require a running server with database.
// They document the expected API behavior.
describe('Auth API (requires server)', () => {
  it('registers a new user with email and password', async () => {
    // POST /api/auth/register with { email, password, displayName }
    // Expect 201, body.user.email, body.user.displayName, no passwordHash
  });

  it('rejects duplicate email registration', async () => {
    // POST /api/auth/register twice with same email
    // Expect 409 on second attempt
  });

  it('rejects invalid registration data', async () => {
    // POST /api/auth/register with invalid email, short password, empty name
    // Expect 400
  });
});