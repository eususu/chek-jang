import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NovelRepository } from '../../src/repositories/novelRepository';
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
  title: '나의 소설',
  description: '판타지 소설',
  created_at: '2024-01-15T09:00:00.000Z',
  updated_at: '2024-01-15T09:00:00.000Z',
};

const expectedNovel = {
  id: 1,
  title: '나의 소설',
  description: '판타지 소설',
  createdAt: '2024-01-15T09:00:00.000Z',
  updatedAt: '2024-01-15T09:00:00.000Z',
};

describe('NovelRepository', () => {
  let db: Database;
  let repo: NovelRepository;

  beforeEach(() => {
    db = createMockDb();
    repo = new NovelRepository(db);
  });

  describe('insert', () => {
    it('should insert a novel and return camelCase result', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue(sampleRow);

      const result = await repo.insert({ title: '나의 소설', description: '판타지 소설' });

      expect(db.get).toHaveBeenCalledWith(
        'INSERT INTO novels (title, description) VALUES ($1, $2) RETURNING *',
        ['나의 소설', '판타지 소설']
      );
      expect(result).toEqual(expectedNovel);
    });

    it('should default description to empty string when omitted', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue({ ...sampleRow, description: '' });

      await repo.insert({ title: '나의 소설' });

      expect(db.get).toHaveBeenCalledWith(
        'INSERT INTO novels (title, description) VALUES ($1, $2) RETURNING *',
        ['나의 소설', '']
      );
    });
  });

  describe('findAll', () => {
    it('should return all novels mapped to camelCase', async () => {
      (db.all as ReturnType<typeof vi.fn>).mockResolvedValue([sampleRow]);

      const result = await repo.findAll();

      expect(db.all).toHaveBeenCalledWith('SELECT * FROM novels ORDER BY id');
      expect(result).toEqual([expectedNovel]);
    });

    it('should return empty array when no novels exist', async () => {
      (db.all as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return novel when found', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue(sampleRow);

      const result = await repo.findById(1);

      expect(db.get).toHaveBeenCalledWith('SELECT * FROM novels WHERE id = $1', [1]);
      expect(result).toEqual(expectedNovel);
    });

    it('should return null when not found', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await repo.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update title and return camelCase result', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue({ ...sampleRow, title: '새 제목' });

      const result = await repo.update(1, { title: '새 제목' });

      expect(db.get).toHaveBeenCalledWith(
        'UPDATE novels SET title = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        ['새 제목', 1]
      );
      expect(result?.title).toBe('새 제목');
    });

    it('should update both title and description', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue(sampleRow);

      await repo.update(1, { title: '새 제목', description: '새 설명' });

      expect(db.get).toHaveBeenCalledWith(
        'UPDATE novels SET title = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        ['새 제목', '새 설명', 1]
      );
    });

    it('should return null when novel not found', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await repo.update(999, { title: '새 제목' });

      expect(result).toBeNull();
    });

    it('should return current novel when no fields to update', async () => {
      (db.get as ReturnType<typeof vi.fn>).mockResolvedValue(sampleRow);

      const result = await repo.update(1, {});

      expect(db.get).toHaveBeenCalledWith('SELECT * FROM novels WHERE id = $1', [1]);
      expect(result).toEqual(expectedNovel);
    });
  });

  describe('delete', () => {
    it('should return true when novel is deleted', async () => {
      (db.run as ReturnType<typeof vi.fn>).mockResolvedValue({ changes: 1, lastInsertRowId: 0 });

      const result = await repo.delete(1);

      expect(db.run).toHaveBeenCalledWith('DELETE FROM novels WHERE id = $1', [1]);
      expect(result).toBe(true);
    });

    it('should return false when novel not found', async () => {
      (db.run as ReturnType<typeof vi.fn>).mockResolvedValue({ changes: 0, lastInsertRowId: 0 });

      const result = await repo.delete(999);

      expect(result).toBe(false);
    });
  });
});
