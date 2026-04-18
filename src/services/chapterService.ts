import { NovelRepository } from '../repositories/novelRepository';
import { ChapterRepository } from '../repositories/chapterRepository';
import { Database } from '../database/database';
import { NotFoundError, ValidationError } from '../errors';
import { Chapter, CreateChapterInput, UpdateChapterInput } from '../types';

export class ChapterService {
  constructor(
    private novelRepo: NovelRepository,
    private chapterRepo: ChapterRepository,
    private db?: Database
  ) {}

  async create(novelId: number, data: CreateChapterInput): Promise<Chapter> {
    const novel = await this.novelRepo.findById(novelId);
    if (!novel) {
      throw new NotFoundError('소설');
    }
    return this.chapterRepo.insert({
      novelId,
      title: data.title,
      content: data.content,
      orderNum: data.orderNum,
    });
  }

  async findById(novelId: number, chapterId: number): Promise<Chapter> {
    const chapter = await this.chapterRepo.findById(novelId, chapterId);
    if (!chapter) {
      throw new NotFoundError('챕터');
    }
    return chapter;
  }

  async update(novelId: number, chapterId: number, data: UpdateChapterInput): Promise<Chapter> {
    const chapter = await this.chapterRepo.update(novelId, chapterId, data);
    if (!chapter) {
      throw new NotFoundError('챕터');
    }
    return chapter;
  }

  async delete(novelId: number, chapterId: number): Promise<boolean> {
    const chapter = await this.chapterRepo.findById(novelId, chapterId);
    if (!chapter) {
      throw new NotFoundError('챕터');
    }
    await this.chapterRepo.delete(novelId, chapterId);

    // Reorder remaining chapters sequentially
    const remaining = await this.chapterRepo.findByNovelId(novelId);
    const orderMap = remaining.map((ch, index) => ({
      id: ch.id,
      order: index + 1,
    }));
    if (orderMap.length > 0) {
      await this.chapterRepo.updateOrders(novelId, orderMap);
    }

    return true;
  }

  async reorder(novelId: number, chapterIds: number[]): Promise<Chapter[]> {
    const novel = await this.novelRepo.findById(novelId);
    if (!novel) {
      throw new NotFoundError('소설');
    }

    const chapters = await this.chapterRepo.findByNovelId(novelId);
    const existingIds = new Set(chapters.map((ch) => ch.id));
    const requestedIds = new Set(chapterIds);

    if (
      existingIds.size !== requestedIds.size ||
      ![...existingIds].every((id) => requestedIds.has(id))
    ) {
      throw new ValidationError([
        { field: 'chapterIds', message: '유효하지 않은 챕터 ID가 포함되어 있습니다' },
      ]);
    }

    const orderMap = chapterIds.map((id, index) => ({
      id,
      order: index + 1,
    }));

    if (this.db) {
      await this.db.transaction(async (txDb) => {
        const txChapterRepo = new ChapterRepository(txDb);
        await txChapterRepo.updateOrders(novelId, orderMap);
      });
    } else {
      await this.chapterRepo.updateOrders(novelId, orderMap);
    }

    // Return chapters in new order
    const result: Chapter[] = [];
    for (const id of chapterIds) {
      const chapter = await this.chapterRepo.findById(novelId, id);
      if (chapter) {
        result.push(chapter);
      }
    }
    return result;
  }
}
