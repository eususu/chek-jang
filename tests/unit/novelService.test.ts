import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NovelService } from '../../src/services/novelService';
import { NovelRepository } from '../../src/repositories/novelRepository';
import { ChapterRepository } from '../../src/repositories/chapterRepository';
import { NotFoundError } from '../../src/errors';

function createMockNovelRepo() {
  return {
    insert: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as NovelRepository;
}

function createMockChapterRepo() {
  return {
    findByNovelId: vi.fn(),
    deleteByNovelId: vi.fn(),
  } as unknown as ChapterRepository;
}

const sampleNovel = {
  id: 1,
  title: '나의 소설',
  description: '판타지 소설',
  createdAt: '2024-01-15T09:00:00.000Z',
  updatedAt: '2024-01-15T09:00:00.000Z',
};

describe('NovelService', () => {
  let novelRepo: NovelRepository;
  let chapterRepo: ChapterRepository;
  let service: NovelService;

  beforeEach(() => {
    novelRepo = createMockNovelRepo();
    chapterRepo = createMockChapterRepo();
    service = new NovelService(novelRepo, chapterRepo);
  });

  describe('create', () => {
    it('should create a novel and return it', async () => {
      (novelRepo.insert as ReturnType<typeof vi.fn>).mockResolvedValue(sampleNovel);

      const result = await service.create({ title: '나의 소설', description: '판타지 소설' });

      expect(novelRepo.insert).toHaveBeenCalledWith({ title: '나의 소설', description: '판타지 소설' });
      expect(result).toEqual(sampleNovel);
    });
  });

  describe('findAll', () => {
    it('should return all novels', async () => {
      (novelRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([sampleNovel]);

      const result = await service.findAll();

      expect(result).toEqual([sampleNovel]);
    });

    it('should return empty array when no novels exist', async () => {
      (novelRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return novel detail with chapters', async () => {
      const chapters = [{ id: 1, title: '1장', orderNum: 1 }];
      (novelRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(sampleNovel);
      (chapterRepo.findByNovelId as ReturnType<typeof vi.fn>).mockResolvedValue(chapters);

      const result = await service.findById(1);

      expect(result).toEqual({ ...sampleNovel, chapters });
    });

    it('should throw NotFoundError when novel does not exist', async () => {
      (novelRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundError);
      await expect(service.findById(999)).rejects.toThrow('소설을(를) 찾을 수 없습니다');
    });
  });

  describe('update', () => {
    it('should update and return the novel', async () => {
      const updated = { ...sampleNovel, title: '새 제목' };
      (novelRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      const result = await service.update(1, { title: '새 제목' });

      expect(novelRepo.update).toHaveBeenCalledWith(1, { title: '새 제목' });
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundError when novel does not exist', async () => {
      (novelRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.update(999, { title: '새 제목' })).rejects.toThrow(NotFoundError);
      await expect(service.update(999, { title: '새 제목' })).rejects.toThrow('소설을(를) 찾을 수 없습니다');
    });
  });

  describe('delete', () => {
    it('should delete the novel and return true', async () => {
      (novelRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(sampleNovel);
      (novelRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const result = await service.delete(1);

      expect(novelRepo.delete).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should throw NotFoundError when novel does not exist', async () => {
      (novelRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundError);
      await expect(service.delete(999)).rejects.toThrow('소설을(를) 찾을 수 없습니다');
    });
  });
});
