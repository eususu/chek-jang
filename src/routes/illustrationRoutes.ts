import { Router } from 'express';
import { IllustrationController } from '../controllers/illustrationController';
import { IllustrationService } from '../services/illustrationService';
import { ChapterRepository } from '../repositories/chapterRepository';
import { IllustrationRepository } from '../repositories/illustrationRepository';
import { validateBody } from '../middleware/validateBody';
import { createIllustrationSchema, updateIllustrationSchema } from '../schemas/illustrationSchemas';
import { db } from '../database/index';

const chapterRepository = new ChapterRepository(db);
const illustrationRepository = new IllustrationRepository(db);
const illustrationService = new IllustrationService(chapterRepository, illustrationRepository);
const illustrationController = new IllustrationController(illustrationService);

const router = Router({ mergeParams: true });

router.post('/', validateBody(createIllustrationSchema), illustrationController.create);
router.get('/', illustrationController.list);
router.get('/:id', illustrationController.getById);
router.put('/:id', validateBody(updateIllustrationSchema), illustrationController.update);
router.delete('/:id', illustrationController.delete);

export default router;
