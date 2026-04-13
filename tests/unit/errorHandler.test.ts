import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../src/middleware/errorHandler';
import { AppError, NotFoundError, ValidationError } from '../../src/errors';

function createMockResNext() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const req = {} as Request;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('errorHandler middleware', () => {
  it('should respond with statusCode and message for AppError instances', () => {
    const { req, res, next } = createMockResNext();
    const err = new AppError(403, '접근이 거부되었습니다');

    errorHandler(err, req, res, next);

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(403);
    expect((res.json as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({
      error: '접근이 거부되었습니다',
    });
  });

  it('should include details when AppError has details', () => {
    const { req, res, next } = createMockResNext();
    const err = new ValidationError([{ field: 'title', message: '필수 항목입니다' }]);

    errorHandler(err, req, res, next);

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(400);
    expect((res.json as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({
      error: '요청 데이터가 유효하지 않습니다',
      details: [{ field: 'title', message: '필수 항목입니다' }],
    });
  });

  it('should respond with 404 for NotFoundError', () => {
    const { req, res, next } = createMockResNext();
    const err = new NotFoundError('소설');

    errorHandler(err, req, res, next);

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(404);
    expect((res.json as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({
      error: '소설을(를) 찾을 수 없습니다',
    });
  });

  it('should respond with 500 for unexpected errors', () => {
    const { req, res, next } = createMockResNext();
    const err = new Error('something broke');

    errorHandler(err, req, res, next);

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(500);
    expect((res.json as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({
      error: '서버 내부 오류가 발생했습니다',
    });
  });

  it('should respond with 400 for JSON parse errors (entity.parse.failed)', () => {
    const { req, res, next } = createMockResNext();
    const err = Object.assign(new Error('invalid json'), { type: 'entity.parse.failed', status: 400 });

    errorHandler(err, req, res, next);

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(400);
    expect((res.json as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({
      error: '유효한 JSON 형식이 아닙니다',
    });
  });
});
