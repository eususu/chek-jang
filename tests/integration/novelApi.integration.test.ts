import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  getDatabaseConfig: () => ({}),
}));

import request from 'supertest';
import app from '../../src/app';
import { db } from '../../src/database/index';

const mockDb = db as unknown as {
  get: ReturnType<typeof vi.fn>;
  all: ReturnType<typeof vi.fn>;
  run: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
};

describe('Novel API integration tests', () => {
  const AUTH = { Authorization: 'Bearer test-token' };

  const sampleNovelRow = {
    id: 1,
    title: '나의 첫 소설',
    description: '판타지 장편 소설',
    created_at: '2024-01-15T09:00:00.000Z',
    updated_at: '2024-01-15T09:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.all.mockResolvedValue([]);
    mockDb.run.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
  });

  // --- Authentication ---

  it('GET /novels without auth → 401', async () => {
    const res = await request(app).get('/novels');
    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('GET /novels with wrong token → 401', async () => {
    const res = await request(app)
      .get('/novels')
      .set('Authorization', 'Bearer wrong-token');
    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  // --- POST /novels ---

  it('POST /novels with valid data → 201, JSON, returns novel', async () => {
    mockDb.get.mockResolvedValueOnce(sampleNovelRow);

    const res = await request(app)
      .post('/novels')
      .set(AUTH)
      .send({ title: '나의 첫 소설', description: '판타지 장편 소설' });

    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('title', '나의 첫 소설');
    expect(res.body).toHaveProperty('description', '판타지 장편 소설');
    expect(res.body).toHaveProperty('createdAt');
    expect(res.body).toHaveProperty('updatedAt');
  });

  it('POST /novels without title → 400 validation error', async () => {
    const res = await request(app)
      .post('/novels')
      .set(AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('error');
  });

  // --- GET /novels ---

  it('GET /novels → 200, JSON, returns array', async () => {
    mockDb.all.mockResolvedValueOnce([sampleNovelRow]);

    const res = await request(app)
      .get('/novels')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // --- GET /novels/:id ---

  it('GET /novels/:id with existing novel → 200, JSON', async () => {
    mockDb.get.mockResolvedValueOnce(sampleNovelRow);
    mockDb.all.mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/novels/1')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('id', 1);
    expect(res.body).toHaveProperty('title', '나의 첫 소설');
  });

  it('GET /novels/:id with non-existent novel → 404', async () => {
    mockDb.get.mockResolvedValueOnce(undefined);

    const res = await request(app)
      .get('/novels/999')
      .set(AUTH);

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  // --- PUT /novels/:id ---

  it('PUT /novels/:id with valid data → 200', async () => {
    const updatedRow = { ...sampleNovelRow, title: '수정된 제목', updated_at: '2024-01-16T09:00:00.000Z' };
    mockDb.get.mockResolvedValueOnce(updatedRow);

    const res = await request(app)
      .put('/novels/1')
      .set(AUTH)
      .send({ title: '수정된 제목' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('title', '수정된 제목');
  });

  // --- DELETE /novels/:id ---

  it('DELETE /novels/:id → 204', async () => {
    mockDb.get.mockResolvedValueOnce(sampleNovelRow);
    mockDb.run.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 1 });

    const res = await request(app)
      .delete('/novels/1')
      .set(AUTH);

    expect(res.status).toBe(204);
  });
});
