import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database before importing app
vi.mock('../../src/database/index', () => ({
  db: {
    get: vi.fn(),
    all: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    transaction: vi.fn(),
    initialize: vi.fn(),
    close: vi.fn(),
  },
}));

vi.mock('../../src/config', () => ({
  config: {
    authToken: 'test-token',
    port: 3000,
    db: {},
  },
}));

import request from 'supertest';
import app from '../../src/app';

describe('Express app setup', () => {
  const validAuth = { Authorization: 'Bearer test-token' };

  it('should return 401 when no auth token is provided', async () => {
    const res = await request(app).get('/novels');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('인증 토큰이 필요합니다');
  });

  it('should return 401 when invalid auth token is provided', async () => {
    const res = await request(app)
      .get('/novels')
      .set('Authorization', 'Bearer wrong-token');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('인증이 필요합니다');
  });

  it('should parse JSON body and reach novel routes', async () => {
    const res = await request(app)
      .get('/novels')
      .set(validAuth);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('should return 400 for invalid JSON body', async () => {
    const res = await request(app)
      .post('/novels')
      .set(validAuth)
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('유효한 JSON 형식이 아닙니다');
  });

  it('should mount chapter routes at /novels/:novelId/chapters', async () => {
    const res = await request(app)
      .get('/novels/1/chapters/1')
      .set(validAuth);
    // Should reach the chapter route (may return 404 for non-existent chapter, not 404 for route)
    expect([200, 404]).toContain(res.status);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('should handle errors through global error handler', async () => {
    const res = await request(app)
      .post('/novels')
      .set(validAuth)
      .send({});
    // Missing required title field → 400 validation error
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/json/);
  });
});
