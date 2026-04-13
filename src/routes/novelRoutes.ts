import { Router } from 'express';
import { NovelController } from '../controllers/novelController';
import { NovelService } from '../services/novelService';
import { NovelRepository } from '../repositories/novelRepository';
import { ChapterRepository } from '../repositories/chapterRepository';
import { validateBody } from '../middleware/validateBody';
import { createNovelSchema, updateNovelSchema } from '../schemas/novelSchemas';
import { db } from '../database/index';

const novelRepository = new NovelRepository(db);
const chapterRepository = new ChapterRepository(db);
const novelService = new NovelService(novelRepository, chapterRepository);
const novelController = new NovelController(novelService);

const router = Router();

router.post('/', validateBody(createNovelSchema), novelController.create);
router.get('/', novelController.list);
router.get('/:id', novelController.getById);
router.put('/:id', validateBody(updateNovelSchema), novelController.update);
router.delete('/:id', novelController.delete);

export default router;
