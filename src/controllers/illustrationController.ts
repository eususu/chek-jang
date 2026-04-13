import { Request, Response, NextFunction } from 'express';
import { IllustrationService } from '../services/illustrationService';

export class IllustrationController {
  constructor(private illustrationService: IllustrationService) {}

  create = async (req: Request<{ novelId: string; chapterId: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const novelId = parseInt(req.params.novelId, 10);
      const chapterId = parseInt(req.params.chapterId, 10);
      const illustration = await this.illustrationService.create(novelId, chapterId, req.body);
      res.status(201).json(illustration);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request<{ novelId: string; chapterId: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const novelId = parseInt(req.params.novelId, 10);
      const chapterId = parseInt(req.params.chapterId, 10);
      const illustrations = await this.illustrationService.findAll(novelId, chapterId);
      res.status(200).json(illustrations);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request<{ novelId: string; chapterId: string; id: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const novelId = parseInt(req.params.novelId, 10);
      const chapterId = parseInt(req.params.chapterId, 10);
      const id = parseInt(req.params.id, 10);
      const illustration = await this.illustrationService.findById(novelId, chapterId, id);
      res.status(200).json(illustration);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request<{ novelId: string; chapterId: string; id: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const novelId = parseInt(req.params.novelId, 10);
      const chapterId = parseInt(req.params.chapterId, 10);
      const id = parseInt(req.params.id, 10);
      const illustration = await this.illustrationService.update(novelId, chapterId, id, req.body);
      res.status(200).json(illustration);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request<{ novelId: string; chapterId: string; id: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const novelId = parseInt(req.params.novelId, 10);
      const chapterId = parseInt(req.params.chapterId, 10);
      const id = parseInt(req.params.id, 10);
      await this.illustrationService.delete(novelId, chapterId, id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
