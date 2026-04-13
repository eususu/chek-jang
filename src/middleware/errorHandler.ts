import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';

export function errorHandler(
  err: Error & { type?: string; status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ error: '유효한 JSON 형식이 아닙니다' });
    return;
  }

  if (err instanceof AppError) {
    const body: { error: string; details?: Array<{ field: string; message: string }> } = {
      error: err.message,
    };
    if (err.details) {
      body.details = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  res.status(500).json({ error: '서버 내부 오류가 발생했습니다' });
}
