import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pg module
const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockEnd = vi.fn();
const mockClientQuery = vi.fn();
const mockClientRelease = vi.fn();

vi.mock('pg', () => {
  return {
    Pool: vi.fn().mockImplementation(() => ({
      query: mockQuery,
      connect: mockConnect,
      end: mockEnd,
    })),
  };
});

import { Database } from '../../src/database/database';

describe('Database', () => {
  let db: Database;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue({
      query: mockClientQuery,
      release: mockClientRelease,
    });
    db = new Database({ host: 'localhost', port: 5432, database: 'test' });
  });

  describe('constructor', () => {
    it('should create a Database instance with connectionString config', () => {
      const instance = new Database({ connectionString: 'postgresql://user:pass@localhost/db' });
      expect(instance).toBeInstanceOf(Database);
    });

    it('should create a Database instance with individual config', () => {
      const instance = new Database({ host: 'myhost', port: 5433, database: 'mydb', user: 'me', password: 'secret' });
      expect(instance).toBeInstanceOf(Database);
    });
  });

  describe('get', () => {
    it('should return the first row from query result', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1, title: 'Test' }] });
      const result = await db.get<{ id: number; title: string }>('SELECT * FROM novels WHERE id = $1', [1]);
      expect(result).toEqual({ id: 1, title: 'Test' });
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM novels WHERE id = $1', [1]);
    });

    it('should return undefined when no rows found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await db.get('SELECT * FROM novels WHERE id = $1', [999]);
      expect(result).toBeUndefined();
    });
  });

  describe('all', () => {
    it('should return all rows from query result', async () => {
      const rows = [{ id: 1, title: 'A' }, { id: 2, title: 'B' }];
      mockQuery.mockResolvedValue({ rows });
      const result = await db.all<{ id: number; title: string }>('SELECT * FROM novels');
      expect(result).toEqual(rows);
    });

    it('should return empty array when no rows', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await db.all('SELECT * FROM novels');
      expect(result).toEqual([]);
    });
  });

  describe('run', () => {
    it('should return lastInsertRowId from RETURNING id', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 42 }], rowCount: 1 });
      const result = await db.run('INSERT INTO novels (title) VALUES ($1) RETURNING id', ['Test']);
      expect(result).toEqual({ lastInsertRowId: 42, changes: 1 });
    });

    it('should return 0 for lastInsertRowId when no rows returned', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 3 });
      const result = await db.run('UPDATE novels SET title = $1', ['New']);
      expect(result).toEqual({ lastInsertRowId: 0, changes: 3 });
    });

    it('should return 0 changes when rowCount is null', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: null });
      const result = await db.run('DELETE FROM novels WHERE id = $1', [999]);
      expect(result).toEqual({ lastInsertRowId: 0, changes: 0 });
    });
  });

  describe('transaction', () => {
    it('should execute function within BEGIN/COMMIT', async () => {
      mockClientQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
      const result = await db.transaction(async (txDb) => {
        await txDb.run('INSERT INTO novels (title) VALUES ($1) RETURNING id', ['Test']);
        return 'done';
      });
      expect(result).toBe('done');
      expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it('should ROLLBACK on error and release client', async () => {
      mockClientQuery.mockImplementation((sql: string) => {
        if (sql === 'BEGIN' || sql === 'ROLLBACK') return Promise.resolve();
        throw new Error('DB error');
      });
      await expect(db.transaction(async (txDb) => {
        await txDb.run('BAD SQL');
      })).rejects.toThrow('DB error');
      expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClientRelease).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('should execute DDL statements for tables and indexes', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      await db.initialize();
      expect(mockQuery).toHaveBeenCalledTimes(4);
      const calls = mockQuery.mock.calls.map((c: unknown[]) => (c[0] as string).trim());
      expect(calls[0]).toContain('CREATE TABLE IF NOT EXISTS novels');
      expect(calls[1]).toContain('CREATE TABLE IF NOT EXISTS chapters');
      expect(calls[2]).toContain('CREATE INDEX IF NOT EXISTS idx_chapters_novel_id');
      expect(calls[3]).toContain('CREATE INDEX IF NOT EXISTS idx_chapters_order');
    });
  });

  describe('close', () => {
    it('should end the pool', async () => {
      mockEnd.mockResolvedValue(undefined);
      await db.close();
      expect(mockEnd).toHaveBeenCalled();
    });
  });
});
