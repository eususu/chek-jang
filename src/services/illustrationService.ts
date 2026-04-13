import { ChapterRepository } from '../repositories/chapterRepository';
import { IllustrationRepository } from '../repositories/illustrationRepository';
import { NotFoundError } from '../errors';
import { Illustration, CreateIllustrationInput, UpdateIllustrationInput } from '../types';

export class IllustrationService {
  constructor(
    private chapterRepo: ChapterRepository,
    private illustrationRepo: IllustrationRepository
  ) {}

  async create(novelId: number, chapterId: number, data: CreateIllustrationInput): Promise<Illustration> {
    const chapter = await this.chapterRepo.findById(novelId, chapterId);
    if (!chapter) {
      throw new NotFoundError('챕터');
    }
    const maxOrder = await this.illustrationRepo.getMaxOrder(chapterId);
    return this.illustrationRepo.insert({
      chapterId,
      imageUrl: data.imageUrl,
      caption: data.caption,
      orderNum: maxOrder + 1,
    });
  }

  async findAll(novelId: number, chapterId: number): Promise<Illustration[]> {
    const chapter = await this.chapterRepo.findById(novelId, chapterId);
    if (!chapter) {
      throw new NotFoundError('챕터');
    }
    return this.illustrationRepo.findByChapterId(chapterId);
  }

  async findById(novelId: number, chapterId: number, illustrationId: number): Promise<Illustration> {
    const chapter = await this.chapterRepo.findById(novelId, chapterId);
    if (!chapter) {
      throw new NotFoundError('챕터');
    }
    const illustration = await this.illustrationRepo.findById(chapterId, illustrationId);
    if (!illustration) {
      throw new NotFoundError('삽화');
    }
    return illustration;
  }

  async update(novelId: number, chapterId: number, illustrationId: number, data: UpdateIllustrationInput): Promise<Illustration> {
    const chapter = await this.chapterRepo.findById(novelId, chapterId);
    if (!chapter) {
      throw new NotFoundError('챕터');
    }
    const illustration = await this.illustrationRepo.update(chapterId, illustrationId, data);
    if (!illustration) {
      throw new NotFoundError('삽화');
    }
    return illustration;
  }

  async delete(novelId: number, chapterId: number, illustrationId: number): Promise<boolean> {
    const chapter = await this.chapterRepo.findById(novelId, chapterId);
    if (!chapter) {
      throw new NotFoundError('챕터');
    }
    const illustration = await this.illustrationRepo.findById(chapterId, illustrationId);
    if (!illustration) {
      throw new NotFoundError('삽화');
    }
    return this.illustrationRepo.delete(chapterId, illustrationId);
  }
}
