import { Request, Response, NextFunction } from 'express';
import { NovelService } from '../services/novelService';

export class NovelController {
  constructor(private novelService: NovelService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const novel = await this.novelService.create(req.body);
      res.status(201).json(novel);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const novels = await this.novelService.findAll();
      res.status(200).json(novels);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      const novel = await this.novelService.findById(id);
      res.status(200).json(novel);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      const novel = await this.novelService.update(id, req.body);
      res.status(200).json(novel);
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      await this.novelService.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
