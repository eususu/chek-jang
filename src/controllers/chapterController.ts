import { Request, Response, NextFunction } from 'express';
import { ChapterService } from '../services/chapterService';

export class ChapterController {
  constructor(private chapterService: ChapterService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const novelId = parseInt(req.params.novelId, 10);
      const chapter = await this.chapterService.create(novelId, req.body);
      res.status(201).json(chapter);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const novelId = parseInt(req.params.novelId, 10);
      const id = parseInt(req.params.id, 10);
      const chapter = await this.chapterService.findById(novelId, id);
      res.status(200).json(chapter);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const novelId = parseInt(req.params.novelId, 10);
      const id = parseInt(req.params.id, 10);
      const chapter = await this.chapterService.update(novelId, id, req.body);
      res.status(200).json(chapter);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const novelId = parseInt(req.params.novelId, 10);
      const id = parseInt(req.params.id, 10);
      await this.chapterService.delete(novelId, id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  reorder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const novelId = parseInt(req.params.novelId, 10);
      const chapters = await this.chapterService.reorder(novelId, req.body.chapterIds);
      res.status(200).json(chapters);
    } catch (error) {
      next(error);
    }
  };
}
