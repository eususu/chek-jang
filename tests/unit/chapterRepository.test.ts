import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChapterRepository } from '../../src/repositories/chapterRepository';
import { Database } from '../../src/database/database';

function createMockDb() {
  return {
    get: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
  } as unknown as Database;
}

const sampleRow = {
  id: 1,
  novel_id: 10,
  title: '제1장',
  content: '옛날 옛적에...',
  order_num: 1,
  created_at: '2024-01-15T09:00:00.000Z',
  updated_at: '2024-01-15T09:00:00.000Z',
};

const expectedChapter = {
  id: 1,
  novelId: 10,
  title: '제1장',
  content: '옛날 옛적에...',
  orderNum: 1,
  createdAt: '2024-01-15T09:00:00.000Z',
  updatedAt: '2024-01-15T09:00:00.000Z',
};

describe('ChapterRepository', () => {
  let db: Database;
  let repo: ChapterRepository;

  beforeEach(() => {
    db = createMockDb();
    repo = new ChapterRepository(db);
  });

  describe('insert', () => {
    it('should insert a chapter and return camelCase result', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue(sampleRow);

      const result = await repo.insert({ novelId: 10, title: '제1장', content: '옛날 옛적에...', orderNum: 1 });

      expect(db.get).toHaveBeenCalledWith(
        'INSERT INTO chapters (novel_id, title, content, order_num) VALUES ($1, $2, $3, $4) RETURNING *',
        [10, '제1장', '옛날 옛적에...', 1]
      );
      expect(result).toEqual(expectedChapter);
    });

    it('should default content to empty string when omitted', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue({ ...sampleRow, content: '' });

      await repo.insert({ novelId: 10, title: '제1장', orderNum: 1 });

      expect(db.get).toHaveBeenCalledWith(
        'INSERT INTO chapters (novel_id, title, content, order_num) VALUES ($1, $2, $3, $4) RETURNING *',
        [10, '제1장', '', 1]
      );
    });
  });

  describe('findByNovelId', () => {
    it('should return chapter summaries ordered by order_num', async () => {
      (db.all as ReturnType<typeof vi.fn>).mockResolvedValue([sampleRow]);

      const result = await repo.findByNovelId(10);

      expect(db.all).toHaveBeenCalledWith(
        'SELECT * FROM chapters WHERE novel_id = $1 ORDER BY order_num',
        [10]
      );
      expect(result).toEqual([{ id: 1, title: '제1장', orderNum: 1 }]);
    });

    it('should return empty array when no chapters exist', async () => {
      (db.all as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await repo.findByNovelId(10);

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return chapter when found', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue(sampleRow);

      const result = await repo.findById(10, 1);

      expect(db.get).toHaveBeenCalledWith(
        'SELECT * FROM chapters WHERE novel_id = $1 AND id = $2',
        [10, 1]
      );
      expect(result).toEqual(expectedChapter);
    });

    it('should return null when not found', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await repo.findById(10, 999);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update title and return camelCase result', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue({ ...sampleRow, title: '새 제목' });

      const result = await repo.update(10, 1, { title: '새 제목' });

      expect(db.get).toHaveBeenCalledWith(
        'UPDATE chapters SET title = $1, updated_at = NOW() WHERE novel_id = $2 AND id = $3 RETURNING *',
        ['새 제목', 10, 1]
      );
      expect(result?.title).toBe('새 제목');
    });

    it('should update both title and content', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue(sampleRow);

      await repo.update(10, 1, { title: '새 제목', content: '새 내용' });

      expect(db.get).toHaveBeenCalledWith(
        'UPDATE chapters SET title = $1, content = $2, updated_at = NOW() WHERE novel_id = $3 AND id = $4 RETURNING *',
        ['새 제목', '새 내용', 10, 1]
      );
    });

    it('should return null when chapter not found', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await repo.update(10, 999, { title: '새 제목' });

      expect(result).toBeNull();
    });

    it('should return current chapter when no fields to update', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue(sampleRow);

      const result = await repo.update(10, 1, {});

      expect(db.get).toHaveBeenCalledWith(
        'SELECT * FROM chapters WHERE novel_id = $1 AND id = $2',
        [10, 1]
      );
      expect(result).toEqual(expectedChapter);
    });
  });

  describe('delete', () => {
    it('should return true when chapter is deleted', async () => {
      (db.run as ReturnType<typeof vi.fn>).mockResolvedValue({ changes: 1, lastInsertRowId: 0 });

      const result = await repo.delete(10, 1);

      expect(db.run).toHaveBeenCalledWith(
        'DELETE FROM chapters WHERE novel_id = $1 AND id = $2',
        [10, 1]
      );
      expect(result).toBe(true);
    });

    it('should return false when chapter not found', async () => {
      (db.run as ReturnType<typeof vi.fn>).mockResolvedValue({ changes: 0, lastInsertRowId: 0 });

      const result = await repo.delete(10, 999);

      expect(result).toBe(false);
    });
  });

  describe('getMaxOrder', () => {
    it('should return max order_num for a novel', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue({ max_order: 5 });

      const result = await repo.getMaxOrder(10);

      expect(db.get).toHaveBeenCalledWith(
        'SELECT MAX(order_num) as max_order FROM chapters WHERE novel_id = $1',
        [10]
      );
      expect(result).toBe(5);
    });

    it('should return 0 when no chapters exist', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue({ max_order: null });

      const result = await repo.getMaxOrder(10);

      expect(result).toBe(0);
    });
  });

  describe('updateOrders', () => {
    it('should update order_num for each chapter in the orderMap', async () => {
      (db.run as ReturnType<typeof vi.fn>).mockResolvedValue({ changes: 1, lastInsertRowId: 0 });

      await repo.updateOrders(10, [
        { id: 1, order: 2 },
        { id: 2, order: 1 },
      ]);

      expect(db.run).toHaveBeenCalledTimes(2);
      expect(db.run).toHaveBeenCalledWith(
        'UPDATE chapters SET order_num = $1, updated_at = NOW() WHERE novel_id = $2 AND id = $3',
        [2, 10, 1]
      );
      expect(db.run).toHaveBeenCalledWith(
        'UPDATE chapters SET order_num = $1, updated_at = NOW() WHERE novel_id = $2 AND id = $3',
        [1, 10, 2]
      );
    });
  });

  describe('deleteByNovelId', () => {
    it('should delete all chapters for a novel', async () => {
      (db.run as ReturnType<typeof vi.fn>).mockResolvedValue({ changes: 3, lastInsertRowId: 0 });

      await repo.deleteByNovelId(10);

      expect(db.run).toHaveBeenCalledWith(
        'DELETE FROM chapters WHERE novel_id = $1',
        [10]
      );
    });
  });
});
