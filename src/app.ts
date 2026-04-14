import express from 'express';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import novelRoutes from './routes/novelRoutes';
import chapterRoutes from './routes/chapterRoutes';
import illustrationRoutes from './routes/illustrationRoutes';
import pydanticSchemaRoutes from './routes/pydanticSchemaRoutes';

const app = express();

app.use(express.json());

// 인증 불필요 라우트
app.use('/schemas/pydantic', pydanticSchemaRoutes);

// 인증 필요 라우트
app.use(authMiddleware);
app.use('/novels', novelRoutes);
app.use('/novels/:novelId/chapters', chapterRoutes);
app.use('/novels/:novelId/chapters/:chapterId/illustrations', illustrationRoutes);

app.use(errorHandler);

export default app;
