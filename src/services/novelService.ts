import { NovelRepository } from '../repositories/novelRepository';
import { ChapterRepository } from '../repositories/chapterRepository';
import { NotFoundError } from '../errors';
import { Novel, NovelSummary, NovelDetail, CreateNovelInput, UpdateNovelInput } from '../types';

export class NovelService {
  constructor(
    private novelRepo: NovelRepository,
    private chapterRepo: ChapterRepository
  ) {}

  async create(data: CreateNovelInput): Promise<Novel> {
    return this.novelRepo.insert(data);
  }

  async findAll(): Promise<NovelSummary[]> {
    return this.novelRepo.findAll();
  }

  async findById(id: number): Promise<NovelDetail> {
    const novel = await this.novelRepo.findById(id);
    if (!novel) {
      throw new NotFoundError('소설');
    }
    const chapters = await this.chapterRepo.findByNovelId(id);
    return { ...novel, chapters };
  }

  async update(id: number, data: UpdateNovelInput): Promise<Novel> {
    const novel = await this.novelRepo.update(id, data);
    if (!novel) {
      throw new NotFoundError('소설');
    }
    return novel;
  }

  async delete(id: number): Promise<boolean> {
    const novel = await this.novelRepo.findById(id);
    if (!novel) {
      throw new NotFoundError('소설');
    }
    return this.novelRepo.delete(id);
  }
}
