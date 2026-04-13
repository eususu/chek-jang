import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ChapterService } from '../../src/services/chapterService';
import { NovelRepository } from '../../src/repositories/novelRepository';
import { ChapterRepository } from '../../src/repositories/chapterRepository';
import { Novel, Chapter } from '../../src/types';

/**
 * Feature: novel-writing-server, Property 7: 챕터 생성 라운드 트립 및 자동 순서 부여
 * Validates: Requirements 6.1, 6.3, 7.1
 *
 * For any existing novel with N chapters created sequentially, each chapter
 * should be assigned order numbers 1 through N automatically, and retrieving
 * each chapter by ID should return matching title and content.
 */

function createInMemoryNovelRepo(): NovelRepository {
  const store = new Map<number, Novel>();
  let nextId = 1;

  return {
    async insert(data: { title: string; description?: string }): Promise<Novel> {
      const now = new Date().toISOString();
      const novel: Novel = {
        id: nextId++,
        title: data.title,
        description: data.description ?? '',
        createdAt: now,
        updatedAt: now,
      };
      store.set(novel.id, novel);
      return novel;
    },
    async findById(id: number): Promise<Novel | null> {
      return store.get(id) ?? null;
    },
  } as unknown as NovelRepository;
}

function createInMemoryChapterRepo(): ChapterRepository {
  const store = new Map<number, Chapter>();
  let nextId = 1;

  return {
    async insert(data: { novelId: number; title: string; content?: string; orderNum: number }): Promise<Chapter> {
      const now = new Date().toISOString();
      const chapter: Chapter = {
        id: nextId++,
        novelId: data.novelId,
        title: data.title,
        content: data.content ?? '',
        orderNum: data.orderNum,
        createdAt: now,
        updatedAt: now,
      };
      store.set(chapter.id, chapter);
      return chapter;
    },
    async getMaxOrder(novelId: number): Promise<number> {
      let max = 0;
      for (const ch of store.values()) {
        if (ch.novelId === novelId && ch.orderNum > max) {
          max = ch.orderNum;
        }
      }
      return max;
    },
    async findById(novelId: number, chapterId: number): Promise<Chapter | null> {
      const ch = store.get(chapterId);
      if (ch && ch.novelId === novelId) return ch;
      return null;
    },
  } as unknown as ChapterRepository;
}

describe('Feature: novel-writing-server, Property 7: 챕터 생성 라운드 트립 및 자동 순서 부여', () => {
  let novelRepo: NovelRepository;
  let chapterRepo: ChapterRepository;
  let service: ChapterService;

  beforeEach(() => {
    novelRepo = createInMemoryNovelRepo();
    chapterRepo = createInMemoryChapterRepo();
    service = new ChapterService(novelRepo, chapterRepo, undefined);
  });

  it('N sequentially created chapters get order 1..N and round-trip title/content correctly', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 200 }),
            content: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        async (chapterInputs) => {
          // Fresh stores per iteration
          novelRepo = createInMemoryNovelRepo();
          chapterRepo = createInMemoryChapterRepo();
          service = new ChapterService(novelRepo, chapterRepo, undefined);

          // Create a novel first
          const novel = await (novelRepo as any).insert({ title: 'Test Novel' });

          const createdChapters: Chapter[] = [];

          // Create chapters sequentially
          for (const input of chapterInputs) {
            const chapter = await service.create(novel.id, {
              title: input.title,
              content: input.content,
            });
            createdChapters.push(chapter);
          }

          // Verify each chapter
          for (let i = 0; i < createdChapters.length; i++) {
            const created = createdChapters[i];
            const input = chapterInputs[i];

            // Order numbers should be 1 through N
            expect(created.orderNum).toBe(i + 1);

            // Round-trip: retrieve by ID and verify title/content match
            const retrieved = await service.findById(novel.id, created.id);
            expect(retrieved.title).toBe(input.title);
            expect(retrieved.content).toBe(input.content ?? '');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: novel-writing-server, Property 8: 챕터 수정 적용 및 수정일 갱신
 * Validates: Requirements 8.1, 8.2
 *
 * For any existing chapter and valid update input (title or content),
 * after updating, the returned chapter should reflect the updated fields,
 * and updatedAt should be >= the original updatedAt.
 */

function createNovelRepoForUpdate(): NovelRepository {
  const store = new Map<number, Novel>();
  let nextId = 1;

  return {
    async insert(data: { title: string; description?: string }): Promise<Novel> {
      const now = new Date().toISOString();
      const novel: Novel = {
        id: nextId++,
        title: data.title,
        description: data.description ?? '',
        createdAt: now,
        updatedAt: now,
      };
      store.set(novel.id, novel);
      return novel;
    },
    async findById(id: number): Promise<Novel | null> {
      return store.get(id) ?? null;
    },
  } as unknown as NovelRepository;
}

function createChapterRepoForUpdate(): ChapterRepository {
  const store = new Map<number, Chapter>();
  let nextId = 1;

  return {
    async insert(data: { novelId: number; title: string; content?: string; orderNum: number }): Promise<Chapter> {
      const now = new Date().toISOString();
      const chapter: Chapter = {
        id: nextId++,
        novelId: data.novelId,
        title: data.title,
        content: data.content ?? '',
        orderNum: data.orderNum,
        createdAt: now,
        updatedAt: now,
      };
      store.set(chapter.id, chapter);
      return chapter;
    },
    async getMaxOrder(novelId: number): Promise<number> {
      let max = 0;
      for (const ch of store.values()) {
        if (ch.novelId === novelId && ch.orderNum > max) {
          max = ch.orderNum;
        }
      }
      return max;
    },
    async findById(novelId: number, chapterId: number): Promise<Chapter | null> {
      const ch = store.get(chapterId);
      if (ch && ch.novelId === novelId) return ch;
      return null;
    },
    async update(novelId: number, chapterId: number, data: { title?: string; content?: string }): Promise<Chapter | null> {
      const ch = store.get(chapterId);
      if (!ch || ch.novelId !== novelId) return null;

      const updated: Chapter = {
        ...ch,
        title: data.title !== undefined ? data.title : ch.title,
        content: data.content !== undefined ? data.content : ch.content,
        updatedAt: new Date().toISOString(),
      };
      store.set(chapterId, updated);
      return updated;
    },
  } as unknown as ChapterRepository;
}

describe('Feature: novel-writing-server, Property 8: 챕터 수정 적용 및 수정일 갱신', () => {
  let novelRepo: NovelRepository;
  let chapterRepo: ChapterRepository;
  let service: ChapterService;

  beforeEach(() => {
    novelRepo = createNovelRepoForUpdate();
    chapterRepo = createChapterRepoForUpdate();
    service = new ChapterService(novelRepo, chapterRepo, undefined);
  });

  it('updating a chapter reflects the new fields and updatedAt >= original updatedAt', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          originalTitle: fc.string({ minLength: 1, maxLength: 200 }),
          originalContent: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
        }),
        fc.record({
          newTitle: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
          newContent: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
        }),
        async (original, updateInput) => {
          // Fresh stores per iteration
          novelRepo = createNovelRepoForUpdate();
          chapterRepo = createChapterRepoForUpdate();
          service = new ChapterService(novelRepo, chapterRepo, undefined);

          // Create a novel and a chapter
          const novel = await (novelRepo as any).insert({ title: 'Test Novel' });
          const chapter = await service.create(novel.id, {
            title: original.originalTitle,
            content: original.originalContent,
          });

          const originalUpdatedAt = chapter.updatedAt;

          // Build update data — at least one field should be present
          const updateData: { title?: string; content?: string } = {};
          if (updateInput.newTitle !== undefined) updateData.title = updateInput.newTitle;
          if (updateInput.newContent !== undefined) updateData.content = updateInput.newContent;

          // If both are undefined, skip (no-op update)
          if (updateData.title === undefined && updateData.content === undefined) {
            return;
          }

          const updated = await service.update(novel.id, chapter.id, updateData);

          // Updated fields should be reflected
          if (updateData.title !== undefined) {
            expect(updated.title).toBe(updateData.title);
          } else {
            expect(updated.title).toBe(original.originalTitle);
          }

          if (updateData.content !== undefined) {
            expect(updated.content).toBe(updateData.content);
          } else {
            expect(updated.content).toBe(original.originalContent ?? '');
          }

          // updatedAt should be >= original
          expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
            new Date(originalUpdatedAt).getTime()
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: novel-writing-server, Property 9: 챕터 삭제 후 순서 재정렬
 * Validates: Requirements 9.1, 9.2
 *
 * For any novel with N chapters (N >= 2), after deleting any one chapter,
 * the remaining N-1 chapters should have consecutive order numbers 1 through N-1,
 * and the original relative order should be preserved.
 */

function createNovelRepoForDelete(): NovelRepository {
  const store = new Map<number, Novel>();
  let nextId = 1;

  return {
    async insert(data: { title: string; description?: string }): Promise<Novel> {
      const now = new Date().toISOString();
      const novel: Novel = {
        id: nextId++,
        title: data.title,
        description: data.description ?? '',
        createdAt: now,
        updatedAt: now,
      };
      store.set(novel.id, novel);
      return novel;
    },
    async findById(id: number): Promise<Novel | null> {
      return store.get(id) ?? null;
    },
  } as unknown as NovelRepository;
}

function createChapterRepoForDelete(): ChapterRepository {
  const store = new Map<number, Chapter>();
  let nextId = 1;

  return {
    async insert(data: { novelId: number; title: string; content?: string; orderNum: number }): Promise<Chapter> {
      const now = new Date().toISOString();
      const chapter: Chapter = {
        id: nextId++,
        novelId: data.novelId,
        title: data.title,
        content: data.content ?? '',
        orderNum: data.orderNum,
        createdAt: now,
        updatedAt: now,
      };
      store.set(chapter.id, chapter);
      return chapter;
    },
    async getMaxOrder(novelId: number): Promise<number> {
      let max = 0;
      for (const ch of store.values()) {
        if (ch.novelId === novelId && ch.orderNum > max) {
          max = ch.orderNum;
        }
      }
      return max;
    },
    async findById(novelId: number, chapterId: number): Promise<Chapter | null> {
      const ch = store.get(chapterId);
      if (ch && ch.novelId === novelId) return ch;
      return null;
    },
    async findByNovelId(novelId: number): Promise<Array<{ id: number; title: string; orderNum: number }>> {
      const chapters: Chapter[] = [];
      for (const ch of store.values()) {
        if (ch.novelId === novelId) chapters.push(ch);
      }
      chapters.sort((a, b) => a.orderNum - b.orderNum);
      return chapters.map((ch) => ({ id: ch.id, title: ch.title, orderNum: ch.orderNum }));
    },
    async delete(novelId: number, chapterId: number): Promise<boolean> {
      const ch = store.get(chapterId);
      if (ch && ch.novelId === novelId) {
        store.delete(chapterId);
        return true;
      }
      return false;
    },
    async updateOrders(novelId: number, orderMap: Array<{ id: number; order: number }>): Promise<void> {
      for (const item of orderMap) {
        const ch = store.get(item.id);
        if (ch && ch.novelId === novelId) {
          store.set(item.id, { ...ch, orderNum: item.order, updatedAt: new Date().toISOString() });
        }
      }
    },
  } as unknown as ChapterRepository;
}

describe('Feature: novel-writing-server, Property 9: 챕터 삭제 후 순서 재정렬', () => {
  let novelRepo: NovelRepository;
  let chapterRepo: ChapterRepository;
  let service: ChapterService;

  beforeEach(() => {
    novelRepo = createNovelRepoForDelete();
    chapterRepo = createChapterRepoForDelete();
    service = new ChapterService(novelRepo, chapterRepo, undefined);
  });

  it('after deleting any chapter, remaining chapters have consecutive orders 1..N-1 preserving relative order', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            content: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          }),
          { minLength: 2, maxLength: 20 },
        ),
        fc.nat(),
        async (chapterInputs, deleteIndexSeed) => {
          // Fresh stores per iteration
          novelRepo = createNovelRepoForDelete();
          chapterRepo = createChapterRepoForDelete();
          service = new ChapterService(novelRepo, chapterRepo, undefined);

          // Create a novel
          const novel = await (novelRepo as any).insert({ title: 'Test Novel' });

          // Create N chapters sequentially
          const createdChapters: Chapter[] = [];
          for (const input of chapterInputs) {
            const chapter = await service.create(novel.id, {
              title: input.title,
              content: input.content,
            });
            createdChapters.push(chapter);
          }

          const N = createdChapters.length;

          // Pick a chapter to delete using modular arithmetic
          const deleteIndex = deleteIndexSeed % N;
          const chapterToDelete = createdChapters[deleteIndex];

          // Record the original order of chapters excluding the deleted one
          const expectedRemainingIds = createdChapters
            .filter((_, i) => i !== deleteIndex)
            .map((ch) => ch.id);

          // Delete the chapter
          await service.delete(novel.id, chapterToDelete.id);

          // Get remaining chapters via the repo (sorted by orderNum)
          const remaining = await (chapterRepo as any).findByNovelId(novel.id);

          // Should have N-1 chapters
          expect(remaining.length).toBe(N - 1);

          // Order numbers should be consecutive 1 through N-1
          for (let i = 0; i < remaining.length; i++) {
            expect(remaining[i].orderNum).toBe(i + 1);
          }

          // Relative order should be preserved: IDs should match the expected order
          const remainingIds = remaining.map((ch: { id: number }) => ch.id);
          expect(remainingIds).toEqual(expectedRemainingIds);
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: novel-writing-server, Property 10: 챕터 순서 변경 순열 적용
 * Validates: Requirements 10.1
 *
 * For any novel with N chapters and any permutation of those chapter IDs,
 * after calling reorder with that permutation, the chapters' order should
 * match the requested permutation.
 */

function createNovelRepoForReorder(): NovelRepository {
  const store = new Map<number, Novel>();
  let nextId = 1;

  return {
    async insert(data: { title: string; description?: string }): Promise<Novel> {
      const now = new Date().toISOString();
      const novel: Novel = {
        id: nextId++,
        title: data.title,
        description: data.description ?? '',
        createdAt: now,
        updatedAt: now,
      };
      store.set(novel.id, novel);
      return novel;
    },
    async findById(id: number): Promise<Novel | null> {
      return store.get(id) ?? null;
    },
  } as unknown as NovelRepository;
}

function createChapterRepoForReorder(): ChapterRepository {
  const store = new Map<number, Chapter>();
  let nextId = 1;

  return {
    async insert(data: { novelId: number; title: string; content?: string; orderNum: number }): Promise<Chapter> {
      const now = new Date().toISOString();
      const chapter: Chapter = {
        id: nextId++,
        novelId: data.novelId,
        title: data.title,
        content: data.content ?? '',
        orderNum: data.orderNum,
        createdAt: now,
        updatedAt: now,
      };
      store.set(chapter.id, chapter);
      return chapter;
    },
    async getMaxOrder(novelId: number): Promise<number> {
      let max = 0;
      for (const ch of store.values()) {
        if (ch.novelId === novelId && ch.orderNum > max) {
          max = ch.orderNum;
        }
      }
      return max;
    },
    async findById(novelId: number, chapterId: number): Promise<Chapter | null> {
      const ch = store.get(chapterId);
      if (ch && ch.novelId === novelId) return ch;
      return null;
    },
    async findByNovelId(novelId: number): Promise<Array<{ id: number; title: string; orderNum: number }>> {
      const chapters: Chapter[] = [];
      for (const ch of store.values()) {
        if (ch.novelId === novelId) chapters.push(ch);
      }
      chapters.sort((a, b) => a.orderNum - b.orderNum);
      return chapters.map((ch) => ({ id: ch.id, title: ch.title, orderNum: ch.orderNum }));
    },
    async updateOrders(novelId: number, orderMap: Array<{ id: number; order: number }>): Promise<void> {
      for (const item of orderMap) {
        const ch = store.get(item.id);
        if (ch && ch.novelId === novelId) {
          store.set(item.id, { ...ch, orderNum: item.order, updatedAt: new Date().toISOString() });
        }
      }
    },
  } as unknown as ChapterRepository;
}

describe('Feature: novel-writing-server, Property 10: 챕터 순서 변경 순열 적용', () => {
  let novelRepo: NovelRepository;
  let chapterRepo: ChapterRepository;
  let service: ChapterService;

  beforeEach(() => {
    novelRepo = createNovelRepoForReorder();
    chapterRepo = createChapterRepoForReorder();
    service = new ChapterService(novelRepo, chapterRepo, undefined);
  });

  it('after reorder with any permutation, chapters order matches the requested permutation', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            content: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        fc.infiniteStream(fc.nat()),
        async (chapterInputs, seedStream) => {
          // Fresh stores per iteration
          novelRepo = createNovelRepoForReorder();
          chapterRepo = createChapterRepoForReorder();
          service = new ChapterService(novelRepo, chapterRepo, undefined);

          // Create a novel
          const novel = await (novelRepo as any).insert({ title: 'Test Novel' });

          // Create chapters sequentially
          const createdChapters: Chapter[] = [];
          for (const input of chapterInputs) {
            const chapter = await service.create(novel.id, {
              title: input.title,
              content: input.content,
            });
            createdChapters.push(chapter);
          }

          // Build a random permutation using Fisher-Yates with seeds from the stream
          const ids = createdChapters.map((ch) => ch.id);
          const permuted = [...ids];
          for (let i = permuted.length - 1; i > 0; i--) {
            const j = seedStream.next().value! % (i + 1);
            [permuted[i], permuted[j]] = [permuted[j], permuted[i]];
          }

          // Call reorder
          const reordered = await service.reorder(novel.id, permuted);

          // The returned chapters should be in the permuted order
          expect(reordered.length).toBe(permuted.length);
          for (let i = 0; i < permuted.length; i++) {
            expect(reordered[i].id).toBe(permuted[i]);
            // Each chapter should have orderNum = i + 1
            expect(reordered[i].orderNum).toBe(i + 1);
          }

          // Verify via findById that the order was persisted
          for (let i = 0; i < permuted.length; i++) {
            const ch = await service.findById(novel.id, permuted[i]);
            expect(ch.orderNum).toBe(i + 1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: novel-writing-server, Property 11: 순서 변경 시 유효하지 않은 챕터 ID 거부
 * Validates: Requirements 10.2
 *
 * For any novel with chapters, if the reorder request contains chapter IDs
 * that don't belong to that novel, the service should reject the request
 * with a ValidationError specifying the invalid chapter IDs.
 */

import { ValidationError } from '../../src/errors';

describe('Feature: novel-writing-server, Property 11: 순서 변경 시 유효하지 않은 챕터 ID 거부', () => {
  let novelRepo: NovelRepository;
  let chapterRepo: ChapterRepository;
  let service: ChapterService;

  beforeEach(() => {
    novelRepo = createNovelRepoForReorder();
    chapterRepo = createChapterRepoForReorder();
    service = new ChapterService(novelRepo, chapterRepo, undefined);
  });

  it('reorder with an extra ID not belonging to the novel throws ValidationError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            content: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        fc.integer({ min: 90000, max: 999999 }),
        async (chapterInputs, extraId) => {
          novelRepo = createNovelRepoForReorder();
          chapterRepo = createChapterRepoForReorder();
          service = new ChapterService(novelRepo, chapterRepo, undefined);

          const novel = await (novelRepo as any).insert({ title: 'Test Novel' });

          const createdChapters: Chapter[] = [];
          for (const input of chapterInputs) {
            const chapter = await service.create(novel.id, {
              title: input.title,
              content: input.content,
            });
            createdChapters.push(chapter);
          }

          const validIds = createdChapters.map((ch) => ch.id);
          // Ensure extraId doesn't collide with valid IDs
          const safeExtraId = validIds.includes(extraId) ? extraId + 1000000 : extraId;
          const invalidIds = [...validIds, safeExtraId];

          await expect(service.reorder(novel.id, invalidIds)).rejects.toThrow(ValidationError);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('reorder with a missing ID (subset of actual IDs) throws ValidationError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            content: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          }),
          { minLength: 2, maxLength: 10 },
        ),
        async (chapterInputs) => {
          novelRepo = createNovelRepoForReorder();
          chapterRepo = createChapterRepoForReorder();
          service = new ChapterService(novelRepo, chapterRepo, undefined);

          const novel = await (novelRepo as any).insert({ title: 'Test Novel' });

          const createdChapters: Chapter[] = [];
          for (const input of chapterInputs) {
            const chapter = await service.create(novel.id, {
              title: input.title,
              content: input.content,
            });
            createdChapters.push(chapter);
          }

          // Remove the last chapter ID to create a subset
          const subsetIds = createdChapters.slice(0, -1).map((ch) => ch.id);

          await expect(service.reorder(novel.id, subsetIds)).rejects.toThrow(ValidationError);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('reorder with completely wrong IDs throws ValidationError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            content: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        fc.array(fc.integer({ min: 90000, max: 999999 }), { minLength: 1, maxLength: 10 }),
        async (chapterInputs, wrongIds) => {
          novelRepo = createNovelRepoForReorder();
          chapterRepo = createChapterRepoForReorder();
          service = new ChapterService(novelRepo, chapterRepo, undefined);

          const novel = await (novelRepo as any).insert({ title: 'Test Novel' });

          for (const input of chapterInputs) {
            await service.create(novel.id, {
              title: input.title,
              content: input.content,
            });
          }

          await expect(service.reorder(novel.id, wrongIds)).rejects.toThrow(ValidationError);
        },
      ),
      { numRuns: 100 },
    );
  });
});
