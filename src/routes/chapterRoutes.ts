import { Router } from 'express';
import { ChapterController } from '../controllers/chapterController';
import { ChapterService } from '../services/chapterService';
import { NovelRepository } from '../repositories/novelRepository';
import { ChapterRepository } from '../repositories/chapterRepository';
import { validateBody } from '../middleware/validateBody';
import { createChapterSchema, updateChapterSchema, reorderChaptersSchema } from '../schemas/chapterSchemas';
import { db } from '../database/index';

const novelRepository = new NovelRepository(db);
const chapterRepository = new ChapterRepository(db);
const chapterService = new ChapterService(novelRepository, chapterRepository, db);
const chapterController = new ChapterController(chapterService);

const router = Router({ mergeParams: true });

// reorder MUST be registered before :id routes to avoid "reorder" matching as :id
router.put('/reorder', validateBody(reorderChaptersSchema), chapterController.reorder);

router.post('/', validateBody(createChapterSchema), chapterController.create);
router.get('/:id', chapterController.getById);
router.put('/:id', validateBody(updateChapterSchema), chapterController.update);
router.delete('/:id', chapterController.delete);

export default router;
