import { Database } from '../database/database';
import { Novel, NovelSummary } from '../types';

interface NovelRow {
  id: number;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

function toNovel(row: NovelRow): Novel {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class NovelRepository {
  constructor(private db: Database) {}

  async insert(data: { title: string; description?: string }): Promise<Novel> {
    const description = data.description ?? '';
    const row = await this.db.get<NovelRow>(
      'INSERT INTO novels (title, description) VALUES ($1, $2) RETURNING *',
      [data.title, description]
    );
    return toNovel(row!);
  }

  async findAll(): Promise<NovelSummary[]> {
    const rows = await this.db.all<NovelRow>(
      'SELECT * FROM novels ORDER BY id'
    );
    return rows.map(toNovel);
  }

  async findById(id: number): Promise<Novel | null> {
    const row = await this.db.get<NovelRow>(
      'SELECT * FROM novels WHERE id = $1',
      [id]
    );
    return row ? toNovel(row) : null;
  }

  async update(id: number, data: { title?: string; description?: string }): Promise<Novel | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      params.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    params.push(id);

    const sql = `UPDATE novels SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const row = await this.db.get<NovelRow>(sql, params);
    return row ? toNovel(row) : null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.run(
      'DELETE FROM novels WHERE id = $1',
      [id]
    );
    return result.changes > 0;
  }
}
