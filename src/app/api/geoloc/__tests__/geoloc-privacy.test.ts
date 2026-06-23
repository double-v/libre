/**
 * Tests — geoloc privacy (issue #153)
 *
 * Vérifie:
 * - lat/lng arrondis à 2 décimales (~1km) sur update
 * - update throttlé si <10 min depuis le dernier update
 * - invisible mode: geoloc non stocké
 * - distance arrondie au km près si <10km (anti-triangulation)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

// === Helpers ===

function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundDistanceKm(distanceKm: number): number {
  if (distanceKm < 10) return distanceKm < 1 ? 1 : Math.round(distanceKm);
  return distanceKm;
}

// === Unit tests for helpers ===

describe('roundCoord', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundCoord(48.8566123)).toBe(48.86);
    expect(roundCoord(2.3522154)).toBe(2.35);
    expect(roundCoord(-0.123499)).toBe(-0.12);
  });

  it('handles whole numbers', () => {
    expect(roundCoord(48)).toBe(48);
  });
});

describe('roundDistanceKm', () => {
  it('rounds to nearest integer below 10km (min 1)', () => {
    expect(roundDistanceKm(0.3)).toBe(1);
    expect(roundDistanceKm(2.4)).toBe(2);
    expect(roundDistanceKm(7.8)).toBe(8);
    expect(roundDistanceKm(9.9)).toBe(10);
  });

  it('keeps precision at or above 10km', () => {
    expect(roundDistanceKm(10)).toBe(10);
    expect(roundDistanceKm(12.345)).toBe(12.345);
    expect(roundDistanceKm(50.678)).toBe(50.678);
  });
});

// === Integration tests for POST /api/geoloc/update ===

const mockGetServerSession = vi.fn();
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

const fakeDb = {
  profile: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
  block: {
    findMany: vi.fn(),
  },
  encounter: {
    findMany: vi.fn(),
    createMany: vi.fn(),
  },
};
vi.mock('@/lib/db', () => ({
  __esModule: true,
  getDb: () => fakeDb,
}));

const mockRateLimit = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  __esModule: true,
  rateLimit: mockRateLimit,
  limits: { geoloc: { limit: 60, windowMs: 60_000 } },
}));

// Import after mocks
const { POST } = await import('../update/route');

const ALICE_ID = randomUUID();

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/geoloc/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: ALICE_ID } });
  mockRateLimit.mockResolvedValue({ success: true, remaining: 59, resetAt: Date.now() + 60_000 });
  // Default: no existing profile (first update)
  fakeDb.profile.findUnique.mockResolvedValue(null);
  fakeDb.profile.upsert.mockResolvedValue({});
  fakeDb.profile.findMany.mockResolvedValue([]);
  fakeDb.block.findMany.mockResolvedValue([]);
  fakeDb.encounter.findMany.mockResolvedValue([]);
  fakeDb.encounter.createMany.mockResolvedValue({});
});

describe('POST /api/geoloc/update — privacy (issue #153)', () => {
  it('rounds lat/lng to 2 decimal places before storing', async () => {
    const res = await POST(makeRequest({ latitude: 48.8566123, longitude: 2.3522154 }));
    expect(res.status).toBe(200);

    const upsertArgs = fakeDb.profile.upsert.mock.calls[0][0];
    const storedLat = upsertArgs.update.lastKnownLat;
    const storedLng = upsertArgs.update.lastKnownLng;

    // Fuzz adds small noise, but rounding to 2 decimals caps precision at ~1km
    const latDecimals = (storedLat.toString().split('.')[1] || '').length;
    const lngDecimals = (storedLng.toString().split('.')[1] || '').length;
    expect(latDecimals).toBeLessThanOrEqual(2);
    expect(lngDecimals).toBeLessThanOrEqual(2);

    // The rounded value must be close to the original (~1km tolerance)
    expect(Math.abs(storedLat - 48.8566123)).toBeLessThan(0.02);
    expect(Math.abs(storedLng - 2.3522154)).toBeLessThan(0.02);
  });

  it('throttles update if <10 min since last update', async () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago
    fakeDb.profile.findUnique.mockResolvedValue({
      invisibleMode: false,
      lastGeolocAt: recent,
      lastKnownLat: 48.85,
      lastKnownLng: 2.35,
    });

    const res = await POST(makeRequest({ latitude: 48.86, longitude: 2.36 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.throttled).toBe(true);

    // upsert must NOT have been called (update skipped)
    expect(fakeDb.profile.upsert).not.toHaveBeenCalled();
  });

  it('allows update if >10 min since last update', async () => {
    const old = new Date(Date.now() - 15 * 60 * 1000); // 15 min ago
    fakeDb.profile.findUnique.mockResolvedValue({
      invisibleMode: false,
      lastGeolocAt: old,
      lastKnownLat: 48.85,
      lastKnownLng: 2.35,
    });

    const res = await POST(makeRequest({ latitude: 48.86, longitude: 2.36 }));
    expect(res.status).toBe(200);
    expect(fakeDb.profile.upsert).toHaveBeenCalledTimes(1);
  });

  it('does not store geoloc when invisibleMode is true', async () => {
    fakeDb.profile.findUnique.mockResolvedValue({
      invisibleMode: true,
      lastGeolocAt: null,
      lastKnownLat: 0,
      lastKnownLng: 0,
    });

    const res = await POST(makeRequest({ latitude: 48.86, longitude: 2.36 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invisible).toBe(true);

    // upsert must NOT have been called (geoloc not stored)
    expect(fakeDb.profile.upsert).not.toHaveBeenCalled();
  });

  it('allows update when no lastGeolocAt set (first update)', async () => {
    fakeDb.profile.findUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ latitude: 48.86, longitude: 2.36 }));
    expect(res.status).toBe(200);
    expect(fakeDb.profile.upsert).toHaveBeenCalledTimes(1);
  });
});