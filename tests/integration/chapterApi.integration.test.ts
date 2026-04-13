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

describe('Chapter API integration tests', () => {
  const AUTH = { Authorization: 'Bearer test-token' };

  const sampleNovelRow = {
    id: 1,
    title: '테스트 소설',
    description: '',
    created_at: '2024-01-15T09:00:00.000Z',
    updated_at: '2024-01-15T09:00:00.000Z',
  };

  const sampleChapterRow = {
    id: 1,
    novel_id: 1,
    title: '제1장',
    content: '첫 번째 챕터 내용',
    order_num: 1,
    created_at: '2024-01-15T09:00:00.000Z',
    updated_at: '2024-01-15T09:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.all.mockResolvedValue([]);
    mockDb.run.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
  });

  // --- Authentication ---

  it('POST /novels/:novelId/chapters without auth → 401', async () => {
    const res = await request(app)
      .post('/novels/1/chapters')
      .send({ title: '제1장' });
    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('GET /novels/:novelId/chapters/:id without auth → 401', async () => {
    const res = await request(app).get('/novels/1/chapters/1');
    expect(res.status).toBe(401);
  });

  it('PUT /novels/:novelId/chapters/:id without auth → 401', async () => {
    const res = await request(app)
      .put('/novels/1/chapters/1')
      .send({ title: '수정' });
    expect(res.status).toBe(401);
  });

  it('DELETE /novels/:novelId/chapters/:id without auth → 401', async () => {
    const res = await request(app).delete('/novels/1/chapters/1');
    expect(res.status).toBe(401);
  });

  it('PUT /novels/:novelId/chapters/reorder without auth → 401', async () => {
    const res = await request(app)
      .put('/novels/1/chapters/reorder')
      .send({ chapterIds: [1] });
    expect(res.status).toBe(401);
  });

  // --- POST /novels/:novelId/chapters ---

  it('POST /novels/:novelId/chapters with valid data → 201', async () => {
    // findById for novel existence check
    mockDb.get.mockResolvedValueOnce(sampleNovelRow);
    // getMaxOrder
    mockDb.get.mockResolvedValueOnce({ max_order: 0 });
    // insert returning chapter
    mockDb.get.mockResolvedValueOnce(sampleChapterRow);

    const res = await request(app)
      .post('/novels/1/chapters')
      .set(AUTH)
      .send({ title: '제1장', content: '첫 번째 챕터 내용' });

    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('title', '제1장');
    expect(res.body).toHaveProperty('content', '첫 번째 챕터 내용');
    expect(res.body).toHaveProperty('orderNum');
    expect(res.body).toHaveProperty('createdAt');
    expect(res.body).toHaveProperty('updatedAt');
  });

  it('POST /novels/:novelId/chapters without title → 400', async () => {
    const res = await request(app)
      .post('/novels/1/chapters')
      .set(AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('error');
  });

  // --- GET /novels/:novelId/chapters/:id ---

  it('GET /novels/:novelId/chapters/:id with existing chapter → 200', async () => {
    mockDb.get.mockResolvedValueOnce(sampleChapterRow);

    const res = await request(app)
      .get('/novels/1/chapters/1')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('id', 1);
    expect(res.body).toHaveProperty('title', '제1장');
  });

  it('GET /novels/:novelId/chapters/:id with non-existent chapter → 404', async () => {
    mockDb.get.mockResolvedValueOnce(undefined);

    const res = await request(app)
      .get('/novels/1/chapters/999')
      .set(AUTH);

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  // --- PUT /novels/:novelId/chapters/:id ---

  it('PUT /novels/:novelId/chapters/:id with valid data → 200', async () => {
    const updatedRow = { ...sampleChapterRow, title: '수정된 제목', updated_at: '2024-01-16T09:00:00.000Z' };
    mockDb.get.mockResolvedValueOnce(updatedRow);

    const res = await request(app)
      .put('/novels/1/chapters/1')
      .set(AUTH)
      .send({ title: '수정된 제목' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('title', '수정된 제목');
  });

  // --- DELETE /novels/:novelId/chapters/:id ---

  it('DELETE /novels/:novelId/chapters/:id → 204', async () => {
    // findById for existence check
    mockDb.get.mockResolvedValueOnce(sampleChapterRow);
    // delete
    mockDb.run.mockResolvedValueOnce({ lastInsertRowId: 0, changes: 1 });
    // findByNovelId for reorder (returns empty after deletion)
    mockDb.all.mockResolvedValueOnce([]);

    const res = await request(app)
      .delete('/novels/1/chapters/1')
      .set(AUTH);

    expect(res.status).toBe(204);
  });

  // --- PUT /novels/:novelId/chapters/reorder ---

  it('PUT /novels/:novelId/chapters/reorder with valid data → 200', async () => {
    const chapter1 = { ...sampleChapterRow, id: 1, order_num: 1 };
    const chapter2 = { ...sampleChapterRow, id: 2, title: '제2장', order_num: 2 };

    // findById for novel existence check
    mockDb.get.mockResolvedValueOnce(sampleNovelRow);
    // findByNovelId for validation
    mockDb.all.mockResolvedValueOnce([
      { id: 1, title: '제1장', order_num: 1 },
      { id: 2, title: '제2장', order_num: 2 },
    ]);
    // transaction mock - execute the callback
    mockDb.transaction.mockImplementationOnce(async (fn: Function) => {
      await fn(mockDb);
    });
    // updateOrders run calls inside transaction
    mockDb.run.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });
    // findById calls for returning reordered chapters
    mockDb.get.mockResolvedValueOnce({ ...chapter2, order_num: 1 });
    mockDb.get.mockResolvedValueOnce({ ...chapter1, order_num: 2 });

    const res = await request(app)
      .put('/novels/1/chapters/reorder')
      .set(AUTH)
      .send({ chapterIds: [2, 1] });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
