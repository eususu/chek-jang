import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { NovelController } from '../../src/controllers/novelController';
import { NovelService } from '../../src/services/novelService';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    params: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('NovelController', () => {
  let controller: NovelController;
  let service: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let next: NextFunction;

  const sampleNovel = {
    id: 1,
    title: '테스트 소설',
    description: '설명',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    service = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    controller = new NovelController(service as unknown as NovelService);
    next = vi.fn();
  });

  describe('create', () => {
    it('should return 201 with created novel', async () => {
      service.create.mockResolvedValue(sampleNovel);
      const req = mockReq({ body: { title: '테스트 소설', description: '설명' } });
      const res = mockRes();

      await controller.create(req, res, next);

      expect(service.create).toHaveBeenCalledWith({ title: '테스트 소설', description: '설명' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(sampleNovel);
    });

    it('should pass errors to next', async () => {
      const error = new Error('DB error');
      service.create.mockRejectedValue(error);
      const req = mockReq({ body: { title: 'test' } });
      const res = mockRes();

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('list', () => {
    it('should return 200 with array of novels', async () => {
      service.findAll.mockResolvedValue([sampleNovel]);
      const req = mockReq();
      const res = mockRes();

      await controller.list(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([sampleNovel]);
    });

    it('should pass errors to next', async () => {
      const error = new Error('DB error');
      service.findAll.mockRejectedValue(error);
      const req = mockReq();
      const res = mockRes();

      await controller.list(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getById', () => {
    it('should return 200 with novel detail', async () => {
      const detail = { ...sampleNovel, chapters: [] };
      service.findById.mockResolvedValue(detail);
      const req = mockReq({ params: { id: '1' } as any });
      const res = mockRes();

      await controller.getById(req, res, next);

      expect(service.findById).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(detail);
    });

    it('should parse id as integer', async () => {
      service.findById.mockResolvedValue(sampleNovel);
      const req = mockReq({ params: { id: '42' } as any });
      const res = mockRes();

      await controller.getById(req, res, next);

      expect(service.findById).toHaveBeenCalledWith(42);
    });

    it('should pass errors to next', async () => {
      const error = new Error('Not found');
      service.findById.mockRejectedValue(error);
      const req = mockReq({ params: { id: '999' } as any });
      const res = mockRes();

      await controller.getById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('update', () => {
    it('should return 200 with updated novel', async () => {
      const updated = { ...sampleNovel, title: '수정된 제목' };
      service.update.mockResolvedValue(updated);
      const req = mockReq({ params: { id: '1' } as any, body: { title: '수정된 제목' } });
      const res = mockRes();

      await controller.update(req, res, next);

      expect(service.update).toHaveBeenCalledWith(1, { title: '수정된 제목' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('should pass errors to next', async () => {
      const error = new Error('Not found');
      service.update.mockRejectedValue(error);
      const req = mockReq({ params: { id: '1' } as any, body: { title: 'x' } });
      const res = mockRes();

      await controller.update(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('delete', () => {
    it('should return 204 with no body', async () => {
      service.delete.mockResolvedValue(true);
      const req = mockReq({ params: { id: '1' } as any });
      const res = mockRes();

      await controller.delete(req, res, next);

      expect(service.delete).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should pass errors to next', async () => {
      const error = new Error('Not found');
      service.delete.mockRejectedValue(error);
      const req = mockReq({ params: { id: '1' } as any });
      const res = mockRes();

      await controller.delete(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
