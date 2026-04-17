import { Database } from '../database/database';
import { Chapter, ChapterSummary } from '../types';

interface ChapterRow {
  id: number;
  novel_id: number;
  title: string;
  content: string;
  order_num: number;
  created_at: string;
  updated_at: string;
}

function toChapter(row: ChapterRow): Chapter {
  return {
    id: row.id,
    novelId: row.novel_id,
    title: row.title,
    content: row.content,
    orderNum: row.order_num,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toChapterSummary(row: ChapterRow): ChapterSummary {
  return {
    id: row.id,
    title: row.title,
    orderNum: row.order_num,
  };
}

export class ChapterRepository {
  constructor(private db: Database) {}

  async insert(data: { novelId: number; title: string; content?: string; orderNum: number }): Promise<Chapter> {
    const content = data.content ?? '';
    const row = await this.db.get<ChapterRow>(
      'INSERT INTO chapters (novel_id, title, content, order_num) VALUES ($1, $2, $3, $4) RETURNING *',
      [data.novelId, data.title, content, data.orderNum]
    );
    return toChapter(row!);
  }

  async findByNovelId(novelId: number): Promise<ChapterSummary[]> {
    const rows = await this.db.all<ChapterRow>(
      'SELECT * FROM chapters WHERE novel_id = $1 ORDER BY order_num',
      [novelId]
    );
    return rows.map(toChapterSummary);
  }

  async findById(novelId: number, chapterId: number): Promise<Chapter | null> {
    const row = await this.db.get<ChapterRow>(
      'SELECT * FROM chapters WHERE novel_id = $1 AND id = $2',
      [novelId, chapterId]
    );
    return row ? toChapter(row) : null;
  }

  async update(novelId: number, chapterId: number, data: { title?: string; content?: string; orderNum?: number }): Promise<Chapter | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      params.push(data.title);
    }
    if (data.content !== undefined) {
      fields.push(`content = $${paramIndex++}`);
      params.push(data.content);
    }
    if (data.orderNum !== undefined) {
      fields.push(`order_num = $${paramIndex++}`);
      params.push(data.orderNum);
    }

    if (fields.length === 0) {
      return this.findById(novelId, chapterId);
    }

    fields.push(`updated_at = NOW()`);
    params.push(novelId, chapterId);

    const novelIdIndex = paramIndex++;
    const chapterIdIndex = paramIndex++;

    const sql = `UPDATE chapters SET ${fields.join(', ')} WHERE novel_id = $${novelIdIndex} AND id = $${chapterIdIndex} RETURNING *`;
    const row = await this.db.get<ChapterRow>(sql, params);
    return row ? toChapter(row) : null;
  }

  async delete(novelId: number, chapterId: number): Promise<boolean> {
    const result = await this.db.run(
      'DELETE FROM chapters WHERE novel_id = $1 AND id = $2',
      [novelId, chapterId]
    );
    return result.changes > 0;
  }

  async getMaxOrder(novelId: number): Promise<number> {
    const row = await this.db.get<{ max_order: number | null }>(
      'SELECT MAX(order_num) as max_order FROM chapters WHERE novel_id = $1',
      [novelId]
    );
    return row?.max_order ?? 0;
  }

  async updateOrders(novelId: number, orderMap: Array<{ id: number; order: number }>): Promise<void> {
    for (const item of orderMap) {
      await this.db.run(
        'UPDATE chapters SET order_num = $1, updated_at = NOW() WHERE novel_id = $2 AND id = $3',
        [item.order, novelId, item.id]
      );
    }
  }

  async deleteByNovelId(novelId: number): Promise<void> {
    await this.db.run(
      'DELETE FROM chapters WHERE novel_id = $1',
      [novelId]
    );
  }
}
