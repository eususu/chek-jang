import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody } from '../../src/middleware/validateBody';

function createMockReqResNext(body: unknown) {
  const req = { body } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

const testSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

describe('validateBody middleware', () => {
  it('should call next and replace req.body with parsed data on valid input', () => {
    const { req, res, next } = createMockReqResNext({ title: 'My Novel', description: 'A story' });
    const middleware = validateBody(testSchema);

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ title: 'My Novel', description: 'A story' });
    expect((res.status as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('should strip unknown fields from req.body', () => {
    const { req, res, next } = createMockReqResNext({ title: 'Test', extra: 'field' });
    const middleware = validateBody(testSchema);

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ title: 'Test' });
    expect(req.body).not.toHaveProperty('extra');
  });

  it('should return 400 with error details when required field is missing', () => {
    const { req, res, next } = createMockReqResNext({});
    const middleware = validateBody(testSchema);

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(400);
    expect((res.json as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      expect.objectContaining({
        error: '요청 데이터가 유효하지 않습니다',
        details: expect.arrayContaining([
          expect.objectContaining({ field: 'title' }),
        ]),
      }),
    );
  });

  it('should return 400 when title exceeds max length', () => {
    const { req, res, next } = createMockReqResNext({ title: 'a'.repeat(201) });
    const middleware = validateBody(testSchema);

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(400);
    expect((res.json as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      expect.objectContaining({
        error: '요청 데이터가 유효하지 않습니다',
        details: expect.arrayContaining([
          expect.objectContaining({ field: 'title' }),
        ]),
      }),
    );
  });

  it('should return 400 when title is empty string', () => {
    const { req, res, next } = createMockReqResNext({ title: '' });
    const middleware = validateBody(testSchema);

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(400);
  });

  it('should accept valid input with optional field omitted', () => {
    const { req, res, next } = createMockReqResNext({ title: 'Valid Title' });
    const middleware = validateBody(testSchema);

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ title: 'Valid Title' });
  });
});
