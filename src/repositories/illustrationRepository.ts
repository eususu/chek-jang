import { Database } from '../database/database';
import { Illustration } from '../types';

interface IllustrationRow {
  id: number;
  chapter_id: number;
  image_url: string;
  caption: string;
  order_num: number;
  created_at: string;
}

function toIllustration(row: IllustrationRow): Illustration {
  return {
    id: row.id,
    chapterId: row.chapter_id,
    imageUrl: row.image_url,
    caption: row.caption,
    orderNum: row.order_num,
    createdAt: row.created_at,
  };
}

export class IllustrationRepository {
  constructor(private db: Database) {}

  async insert(data: { chapterId: number; imageUrl: string; caption?: string; orderNum: number }): Promise<Illustration> {
    const caption = data.caption ?? '';
    const row = await this.db.get<IllustrationRow>(
      'INSERT INTO illustrations (chapter_id, image_url, caption, order_num) VALUES ($1, $2, $3, $4) RETURNING *',
      [data.chapterId, data.imageUrl, caption, data.orderNum]
    );
    return toIllustration(row!);
  }

  async findByChapterId(chapterId: number): Promise<Illustration[]> {
    const rows = await this.db.all<IllustrationRow>(
      'SELECT * FROM illustrations WHERE chapter_id = $1 ORDER BY order_num',
      [chapterId]
    );
    return rows.map(toIllustration);
  }

  async findById(chapterId: number, illustrationId: number): Promise<Illustration | null> {
    const row = await this.db.get<IllustrationRow>(
      'SELECT * FROM illustrations WHERE chapter_id = $1 AND id = $2',
      [chapterId, illustrationId]
    );
    return row ? toIllustration(row) : null;
  }

  async update(chapterId: number, illustrationId: number, data: { imageUrl?: string; caption?: string }): Promise<Illustration | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.imageUrl !== undefined) {
      fields.push(`image_url = $${paramIndex++}`);
      params.push(data.imageUrl);
    }
    if (data.caption !== undefined) {
      fields.push(`caption = $${paramIndex++}`);
      params.push(data.caption);
    }

    if (fields.length === 0) {
      return this.findById(chapterId, illustrationId);
    }

    params.push(chapterId, illustrationId);
    const chapterIdIndex = paramIndex++;
    const illustrationIdIndex = paramIndex++;

    const sql = `UPDATE illustrations SET ${fields.join(', ')} WHERE chapter_id = $${chapterIdIndex} AND id = $${illustrationIdIndex} RETURNING *`;
    const row = await this.db.get<IllustrationRow>(sql, params);
    return row ? toIllustration(row) : null;
  }

  async delete(chapterId: number, illustrationId: number): Promise<boolean> {
    const result = await this.db.run(
      'DELETE FROM illustrations WHERE chapter_id = $1 AND id = $2',
      [chapterId, illustrationId]
    );
    return result.changes > 0;
  }

  async getMaxOrder(chapterId: number): Promise<number> {
    const row = await this.db.get<{ max_order: number | null }>(
      'SELECT MAX(order_num) as max_order FROM illustrations WHERE chapter_id = $1',
      [chapterId]
    );
    return row?.max_order ?? 0;
  }
}
