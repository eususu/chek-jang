import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '인증 토큰이 필요합니다' });
    return;
  }

  const token = authHeader.slice(7);

  if (token !== config.authToken) {
    res.status(401).json({ error: '인증이 필요합니다' });
    return;
  }

  next();
}
