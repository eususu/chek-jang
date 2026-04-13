import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { NovelService } from '../../src/services/novelService';
import { NovelRepository } from '../../src/repositories/novelRepository';
import { ChapterRepository } from '../../src/repositories/chapterRepository';
import { Novel, ChapterSummary } from '../../src/types';
import { NotFoundError } from '../../src/errors';

/**
 * Feature: novel-writing-server, Property 1: 소설 생성 라운드 트립
 * Validates: Requirements 1.1, 1.3
 *
 * For any valid novel input (title, description), after creating a novel
 * and then retrieving it by ID, the returned title and description should
 * match the input, and createdAt/updatedAt should be valid ISO 8601
 * timestamps that are equal to each other.
 */

/**
 * In-memory store that simulates NovelRepository behavior.
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
    async findAll() {
      return Array.from(store.values());
    },
    async findById(id: number): Promise<Novel | null> {
      return store.get(id) ?? null;
    },
    async update() {
      return null;
    },
    async delete() {
      return false;
    },
  } as unknown as NovelRepository;
}

function createInMemoryChapterRepo(): ChapterRepository {
  return {
    async findByNovelId(): Promise<ChapterSummary[]> {
      return [];
    },
  } as unknown as ChapterRepository;
}

/** ISO 8601 regex for timestamps like 2024-01-15T09:00:00.000Z */
const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

describe('Feature: novel-writing-server, Property 1: 소설 생성 라운드 트립', () => {
  let novelRepo: NovelRepository;
  let chapterRepo: ChapterRepository;
  let service: NovelService;

  beforeEach(() => {
    novelRepo = createInMemoryNovelRepo();
    chapterRepo = createInMemoryChapterRepo();
    service = new NovelService(novelRepo, chapterRepo);
  });

  it('creating a novel and retrieving it by ID returns matching data with valid timestamps', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
        async (title, description) => {
          // Re-create fresh stores per iteration to avoid cross-contamination
          novelRepo = createInMemoryNovelRepo();
          chapterRepo = createInMemoryChapterRepo();
          service = new NovelService(novelRepo, chapterRepo);

          // Create the novel
          const created = await service.create({ title, description });

          // Retrieve by ID
          const retrieved = await service.findById(created.id);

          // Title and description should match input
          expect(retrieved.title).toBe(title);
          expect(retrieved.description).toBe(description ?? '');

          // createdAt and updatedAt should be valid ISO 8601 timestamps
          expect(retrieved.createdAt).toMatch(ISO_8601_REGEX);
          expect(retrieved.updatedAt).toMatch(ISO_8601_REGEX);

          // Parsing them should produce valid dates
          expect(new Date(retrieved.createdAt).getTime()).not.toBeNaN();
          expect(new Date(retrieved.updatedAt).getTime()).not.toBeNaN();

          // createdAt and updatedAt should be equal on creation
          expect(retrieved.createdAt).toBe(retrieved.updatedAt);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: novel-writing-server, Property 3: 소설 목록 완전성
 * Validates: Requirements 2.1, 2.2
 *
 * For any N novels (N >= 0) created, calling findAll() should return
 * exactly N novels, and all created novel titles should be present
 * in the list.
 */
describe('Feature: novel-writing-server, Property 3: 소설 목록 완전성', () => {
  let novelRepo: NovelRepository;
  let chapterRepo: ChapterRepository;
  let service: NovelService;

  beforeEach(() => {
    novelRepo = createInMemoryNovelRepo();
    chapterRepo = createInMemoryChapterRepo();
    service = new NovelService(novelRepo, chapterRepo);
  });

  it('findAll returns exactly N novels with matching titles after creating N novels', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 200 }),
            description: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
          }),
          { minLength: 0, maxLength: 20 },
        ),
        async (inputs) => {
          // Fresh stores per iteration
          novelRepo = createInMemoryNovelRepo();
          chapterRepo = createInMemoryChapterRepo();
          service = new NovelService(novelRepo, chapterRepo);

          // Create all novels
          for (const input of inputs) {
            await service.create(input);
          }

          // Retrieve the full list
          const list = await service.findAll();

          // The list length must equal the number of created novels
          expect(list.length).toBe(inputs.length);

          // Every created title must appear in the list
          const returnedTitles = list.map((n) => n.title);
          for (const input of inputs) {
            expect(returnedTitles).toContain(input.title);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: novel-writing-server, Property 4: 소설 상세 조회 시 챕터 포함
 * Validates: Requirements 3.1
 *
 * For any novel and M chapters belonging to that novel, when retrieving
 * the novel detail (findById), it should return the novel metadata along
 * with exactly M chapter summaries in order.
 */

function createNovelRepoWithChapters() {
  const store = new Map<number, Novel>();
  let nextId = 1;

  return {
    repo: {
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
      async findAll() {
        return Array.from(store.values());
      },
      async findById(id: number): Promise<Novel | null> {
        return store.get(id) ?? null;
      },
      async update() {
        return null;
      },
      async delete() {
        return false;
      },
    } as unknown as NovelRepository,
    store,
  };
}

function createChapterRepoWithStore() {
  const chapterStore: ChapterSummary[] = [];
  let nextChapterId = 1;

  return {
    repo: {
      async findByNovelId(novelId: number): Promise<ChapterSummary[]> {
        return chapterStore
          .filter((c) => (c as ChapterSummary & { novelId: number }).novelId === novelId)
          .sort((a, b) => a.orderNum - b.orderNum);
      },
    } as unknown as ChapterRepository,
    addChapter(novelId: number, title: string, orderNum: number): ChapterSummary {
      const summary: ChapterSummary & { novelId: number } = {
        id: nextChapterId++,
        title,
        orderNum,
        novelId,
      };
      chapterStore.push(summary as unknown as ChapterSummary);
      return { id: summary.id, title: summary.title, orderNum: summary.orderNum };
    },
  };
}

describe('Feature: novel-writing-server, Property 4: 소설 상세 조회 시 챕터 포함', () => {
  it('findById returns novel metadata with exactly M chapter summaries in order', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
        fc.array(
          fc.string({ minLength: 1, maxLength: 200 }),
          { minLength: 0, maxLength: 15 },
        ),
        async (novelTitle, novelDescription, chapterTitles) => {
          // Fresh stores per iteration
          const { repo: novelRepo } = createNovelRepoWithChapters();
          const { repo: chapterRepo, addChapter } = createChapterRepoWithStore();
          const service = new NovelService(novelRepo, chapterRepo);

          // Create the novel
          const novel = await service.create({ title: novelTitle, description: novelDescription });

          // Add M chapters with sequential order numbers
          const expectedChapters: ChapterSummary[] = [];
          for (let i = 0; i < chapterTitles.length; i++) {
            const summary = addChapter(novel.id, chapterTitles[i], i + 1);
            expectedChapters.push(summary);
          }

          // Retrieve novel detail
          const detail = await service.findById(novel.id);

          // Novel metadata should match
          expect(detail.id).toBe(novel.id);
          expect(detail.title).toBe(novelTitle);
          expect(detail.description).toBe(novelDescription ?? '');

          // Should contain exactly M chapters
          expect(detail.chapters.length).toBe(chapterTitles.length);

          // Chapters should be in order and match expected data
          for (let i = 0; i < expectedChapters.length; i++) {
            expect(detail.chapters[i].id).toBe(expectedChapters[i].id);
            expect(detail.chapters[i].title).toBe(expectedChapters[i].title);
            expect(detail.chapters[i].orderNum).toBe(i + 1);
          }

          // Verify ordering is strictly ascending
          for (let i = 1; i < detail.chapters.length; i++) {
            expect(detail.chapters[i].orderNum).toBeGreaterThan(
              detail.chapters[i - 1].orderNum,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: novel-writing-server, Property 5: 소설 수정 적용 및 수정일 갱신
 * Validates: Requirements 4.1, 4.2
 *
 * For any existing novel and valid update input (title or description),
 * after updating, the returned novel should reflect the updated fields,
 * and updatedAt should be >= the original updatedAt.
 */

function createUpdatableNovelRepo() {
  const store = new Map<number, Novel>();
  let nextId = 1;

  return {
    repo: {
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
      async findAll() {
        return Array.from(store.values());
      },
      async findById(id: number): Promise<Novel | null> {
        return store.get(id) ?? null;
      },
      async update(id: number, data: { title?: string; description?: string }): Promise<Novel | null> {
        const existing = store.get(id);
        if (!existing) return null;
        const updated: Novel = {
          ...existing,
          title: data.title !== undefined ? data.title : existing.title,
          description: data.description !== undefined ? data.description : existing.description,
          updatedAt: new Date().toISOString(),
        };
        store.set(id, updated);
        return updated;
      },
      async delete() {
        return false;
      },
    } as unknown as NovelRepository,
    store,
  };
}

describe('Feature: novel-writing-server, Property 5: 소설 수정 적용 및 수정일 갱신', () => {
  it('updating a novel reflects the changed fields and updatedAt >= original updatedAt', () => {
    fc.assert(
      fc.asyncProperty(
        // Original novel input
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
        // Update input: at least one of title or description provided
        fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
        fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
        async (origTitle, origDesc, newTitle, newDesc) => {
          // Ensure at least one update field is provided
          fc.pre(newTitle !== undefined || newDesc !== undefined);

          const { repo: novelRepo } = createUpdatableNovelRepo();
          const chapterRepo = createInMemoryChapterRepo();
          const service = new NovelService(novelRepo, chapterRepo);

          // Create the novel
          const created = await service.create({ title: origTitle, description: origDesc });
          const originalUpdatedAt = new Date(created.updatedAt).getTime();

          // Build update payload
          const updateData: { title?: string; description?: string } = {};
          if (newTitle !== undefined) updateData.title = newTitle;
          if (newDesc !== undefined) updateData.description = newDesc;

          // Update the novel
          const updated = await service.update(created.id, updateData);

          // Updated fields should reflect the request
          if (newTitle !== undefined) {
            expect(updated.title).toBe(newTitle);
          } else {
            expect(updated.title).toBe(origTitle);
          }

          if (newDesc !== undefined) {
            expect(updated.description).toBe(newDesc);
          } else {
            expect(updated.description).toBe(origDesc ?? '');
          }

          // updatedAt should be >= original updatedAt
          const newUpdatedAt = new Date(updated.updatedAt).getTime();
          expect(newUpdatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);

          // id and createdAt should remain unchanged
          expect(updated.id).toBe(created.id);
          expect(updated.createdAt).toBe(created.createdAt);
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: novel-writing-server, Property 6: 소설 삭제 시 연쇄 삭제
 * Validates: Requirements 5.1
 *
 * For any novel and any number of chapters belonging to it, after deleting
 * the novel, both the novel and all its chapters should no longer be
 * retrievable (findById throws NotFoundError for the novel).
 */

/**
 * Creates linked in-memory novel and chapter repos that simulate
 * PostgreSQL ON DELETE CASCADE behavior: deleting a novel also
 * removes all chapters belonging to that novel.
 */
function createCascadingRepos() {
  const novelStore = new Map<number, Novel>();
  const chapterStore: Array<ChapterSummary & { novelId: number }> = [];
  let nextNovelId = 1;
  let nextChapterId = 1;

  const novelRepo = {
    async insert(data: { title: string; description?: string }): Promise<Novel> {
      const now = new Date().toISOString();
      const novel: Novel = {
        id: nextNovelId++,
        title: data.title,
        description: data.description ?? '',
        createdAt: now,
        updatedAt: now,
      };
      novelStore.set(novel.id, novel);
      return novel;
    },
    async findAll() {
      return Array.from(novelStore.values());
    },
    async findById(id: number): Promise<Novel | null> {
      return novelStore.get(id) ?? null;
    },
    async update() {
      return null;
    },
    async delete(id: number): Promise<boolean> {
      const existed = novelStore.delete(id);
      // Simulate ON DELETE CASCADE: remove all chapters for this novel
      for (let i = chapterStore.length - 1; i >= 0; i--) {
        if (chapterStore[i].novelId === id) {
          chapterStore.splice(i, 1);
        }
      }
      return existed;
    },
  } as unknown as NovelRepository;

  const chapterRepo = {
    async findByNovelId(novelId: number): Promise<ChapterSummary[]> {
      return chapterStore
        .filter((c) => c.novelId === novelId)
        .sort((a, b) => a.orderNum - b.orderNum)
        .map(({ id, title, orderNum }) => ({ id, title, orderNum }));
    },
  } as unknown as ChapterRepository;

  return {
    novelRepo,
    chapterRepo,
    addChapter(novelId: number, title: string, orderNum: number): ChapterSummary {
      const summary = { id: nextChapterId++, title, orderNum, novelId };
      chapterStore.push(summary);
      return { id: summary.id, title: summary.title, orderNum: summary.orderNum };
    },
    getChaptersByNovelId(novelId: number): ChapterSummary[] {
      return chapterStore
        .filter((c) => c.novelId === novelId)
        .map(({ id, title, orderNum }) => ({ id, title, orderNum }));
    },
  };
}

describe('Feature: novel-writing-server, Property 6: 소설 삭제 시 연쇄 삭제', () => {
  it('after deleting a novel, findById throws NotFoundError and all chapters are gone', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
        fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 0, maxLength: 15 }),
        async (novelTitle, novelDescription, chapterTitles) => {
          // Fresh stores per iteration
          const { novelRepo, chapterRepo, addChapter, getChaptersByNovelId } = createCascadingRepos();
          const service = new NovelService(novelRepo, chapterRepo);

          // Create the novel
          const novel = await service.create({ title: novelTitle, description: novelDescription });

          // Add chapters belonging to this novel
          for (let i = 0; i < chapterTitles.length; i++) {
            addChapter(novel.id, chapterTitles[i], i + 1);
          }

          // Verify novel and chapters exist before deletion
          const detail = await service.findById(novel.id);
          expect(detail.id).toBe(novel.id);
          expect(detail.chapters.length).toBe(chapterTitles.length);

          // Delete the novel
          const deleted = await service.delete(novel.id);
          expect(deleted).toBe(true);

          // After deletion, findById should throw NotFoundError
          await expect(service.findById(novel.id)).rejects.toThrow(NotFoundError);

          // Chapters belonging to the novel should also be gone (cascade)
          const remainingChapters = getChaptersByNovelId(novel.id);
          expect(remainingChapters.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
