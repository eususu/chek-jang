import { Router } from 'express';
import { PydanticSchemaController } from '../controllers/pydanticSchemaController';

const pydanticSchemaController = new PydanticSchemaController();
const router = Router();

router.get('/', pydanticSchemaController.getSchemas);

export default router;
