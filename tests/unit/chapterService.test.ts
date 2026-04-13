import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChapterService } from '../../src/services/chapterService';
import { NovelRepository } from '../../src/repositories/novelRepository';
import { ChapterRepository } from '../../src/repositories/chapterRepository';
import { NotFoundError, ValidationError } from '../../src/errors';

function createMockNovelRepo() {
  return {
    findById: vi.fn(),
  } as unknown as NovelRepository;
}

function createMockChapterRepo() {
  return {
    insert: vi.fn(),
    findByNovelId: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getMaxOrder: vi.fn(),
    updateOrders: vi.fn(),
  } as unknown as ChapterRepository;
}

const sampleNovel = {
  id: 1,
  title: '나의 소설',
  description: '판타지 소설',
  createdAt: '2024-01-15T09:00:00.000Z',
  updatedAt: '2024-01-15T09:00:00.000Z',
};

const sampleChapter = {
  id: 10,
  novelId: 1,
  title: '1장: 시작',
  content: '옛날 옛적에...',
  orderNum: 1,
  createdAt: '2024-01-15T09:00:00.000Z',
  updatedAt: '2024-01-15T09:00:00.000Z',
};

describe('ChapterService', () => {
  let novelRepo: NovelRepository;
  let chapterRepo: ChapterRepository;
  let service: ChapterService;

  beforeEach(() => {
    novelRepo = createMockNovelRepo();
    chapterRepo = createMockChapterRepo();
    service = new ChapterService(novelRepo, chapterRepo);
  });

  describe('create', () => {
    it('should check novel exists, get max order, and create chapter', async () => {
      (novelRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(sampleNovel);
      (chapterRepo.getMaxOrder as ReturnType<typeof vi.fn>).mockResolvedValue(2);
      (chapterRepo.insert as ReturnType<typeof vi.fn>).mockResolvedValue({ ...sampleChapter, orderNum: 3 });

      const result = await service.create(1, { title: '1장: 시작', content: '옛날 옛적에...' });

      expect(novelRepo.findById).toHaveBeenCalledWith(1);
      expect(chapterRepo.getMaxOrder).toHaveBeenCalledWith(1);
      expect(chapterRepo.insert).toHaveBeenCalledWith({
        novelId: 1,
        title: '1장: 시작',
        content: '옛날 옛적에...',
        orderNum: 3,
      });
      expect(result.orderNum).toBe(3);
    });

    it('should assign order 1 when no chapters exist', async () => {
      (novelRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(sampleNovel);
      (chapterRepo.getMaxOrder as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (chapterRepo.insert as ReturnType<typeof vi.fn>).mockResolvedValue(sampleChapter);

      await service.create(1, { title: '1장: 시작' });

      expect(chapterRepo.insert).toHaveBeenCalledWith({
        novelId: 1,
        title: '1장: 시작',
        content: undefined,
        orderNum: 1,
      });
    });

    it('should throw NotFoundError when novel does not exist', async () => {
      (novelRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.create(999, { title: '챕터' })).rejects.toThrow(NotFoundError);
      await expect(service.create(999, { title: '챕터' })).rejects.toThrow('소설을(를) 찾을 수 없습니다');
    });
  });

  describe('findById', () => {
    it('should return the chapter', async () => {
      (chapterRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(sampleChapter);

      const result = await service.findById(1, 10);

      expect(chapterRepo.findById).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual(sampleChapter);
    });

    it('should throw NotFoundError when chapter does not exist', async () => {
      (chapterRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.findById(1, 999)).rejects.toThrow(NotFoundError);
      await expect(service.findById(1, 999)).rejects.toThrow('챕터을(를) 찾을 수 없습니다');
    });
  });

  describe('update', () => {
    it('should update and return the chapter', async () => {
      const updated = { ...sampleChapter, title: '수정된 제목' };
      (chapterRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      const result = await service.update(1, 10, { title: '수정된 제목' });

      expect(chapterRepo.update).toHaveBeenCalledWith(1, 10, { title: '수정된 제목' });
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundError when chapter does not exist', async () => {
      (chapterRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.update(1, 999, { title: '수정' })).rejects.toThrow(NotFoundError);
      await expect(service.update(1, 999, { title: '수정' })).rejects.toThrow('챕터을(를) 찾을 수 없습니다');
    });
  });

  describe('delete', () => {
    it('should delete chapter and reorder remaining chapters', async () => {
      (chapterRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(sampleChapter);
      (chapterRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (chapterRepo.findByNovelId as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 11, title: '2장', orderNum: 2 },
        { id: 12, title: '3장', orderNum: 3 },
      ]);
      (chapterRepo.updateOrders as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await service.delete(1, 10);

      expect(chapterRepo.findById).toHaveBeenCalledWith(1, 10);
      expect(chapterRepo.delete).toHaveBeenCalledWith(1, 10);
      expect(chapterRepo.findByNovelId).toHaveBeenCalledWith(1);
      expect(chapterRepo.updateOrders).toHaveBeenCalledWith(1, [
        { id: 11, order: 1 },
        { id: 12, order: 2 },
      ]);
      expect(result).toBe(true);
    });

    it('should handle deleting the last chapter (no reorder needed)', async () => {
      (chapterRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(sampleChapter);
      (chapterRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (chapterRepo.findByNovelId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.delete(1, 10);

      expect(chapterRepo.updateOrders).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should throw NotFoundError when chapter does not exist', async () => {
      (chapterRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.delete(1, 999)).rejects.toThrow(NotFoundError);
      await expect(service.delete(1, 999)).rejects.toThrow('챕터을(를) 찾을 수 없습니다');
    });
  });

  describe('reorder', () => {
    it('should validate chapter IDs and update orders', async () => {
      (novelRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(sampleNovel);
      (chapterRepo.findByNovelId as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 10, title: '1장', orderNum: 1 },
        { id: 11, title: '2장', orderNum: 2 },
        { id: 12, title: '3장', orderNum: 3 },
      ]);
      (chapterRepo.updateOrders as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      const ch1 = { ...sampleChapter, id: 12, orderNum: 1 };
      const ch2 = { ...sampleChapter, id: 10, orderNum: 2 };
      const ch3 = { ...sampleChapter, id: 11, orderNum: 3 };
      (chapterRepo.findById as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(ch1)
        .mockResolvedValueOnce(ch2)
        .mockResolvedValueOnce(ch3);

      const result = await service.reorder(1, [12, 10, 11]);

      expect(chapterRepo.updateOrders).toHaveBeenCalledWith(1, [
        { id: 12, order: 1 },
        { id: 10, order: 2 },
        { id: 11, order: 3 },
      ]);
      expect(result).toHaveLength(3);
    });

    it('should throw NotFoundError when novel does not exist', async () => {
      (novelRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.reorder(999, [1, 2])).rejects.toThrow(NotFoundError);
      await expect(service.reorder(999, [1, 2])).rejects.toThrow('소설을(를) 찾을 수 없습니다');
    });

    it('should throw ValidationError when chapter IDs do not match', async () => {
      (novelRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(sampleNovel);
      (chapterRepo.findByNovelId as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 10, title: '1장', orderNum: 1 },
        { id: 11, title: '2장', orderNum: 2 },
      ]);

      await expect(service.reorder(1, [10, 99])).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when chapter IDs count does not match', async () => {
      (novelRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(sampleNovel);
      (chapterRepo.findByNovelId as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 10, title: '1장', orderNum: 1 },
        { id: 11, title: '2장', orderNum: 2 },
      ]);

      await expect(service.reorder(1, [10])).rejects.toThrow(ValidationError);
    });
  });
});
