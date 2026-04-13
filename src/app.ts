import express from 'express';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import novelRoutes from './routes/novelRoutes';
import chapterRoutes from './routes/chapterRoutes';

const app = express();

app.use(express.json());
app.use(authMiddleware);

app.use('/novels', novelRoutes);
app.use('/novels/:novelId/chapters', chapterRoutes);

app.use(errorHandler);

export default app;
