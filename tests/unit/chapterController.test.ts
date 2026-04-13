import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ChapterController } from '../../src/controllers/chapterController';
import { ChapterService } from '../../src/services/chapterService';

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

describe('ChapterController', () => {
  let controller: ChapterController;
  let service: {
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    reorder: ReturnType<typeof vi.fn>;
  };
  let next: NextFunction;

  const sampleChapter = {
    id: 1,
    novelId: 10,
    title: '제1장',
    content: '본문 내용',
    orderNum: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    service = {
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      reorder: vi.fn(),
    };
    controller = new ChapterController(service as unknown as ChapterService);
    next = vi.fn();
  });

  describe('create', () => {
    it('should return 201 with created chapter', async () => {
      service.create.mockResolvedValue(sampleChapter);
      const req = mockReq({ params: { novelId: '10' } as any, body: { title: '제1장' } });
      const res = mockRes();

      await controller.create(req, res, next);

      expect(service.create).toHaveBeenCalledWith(10, { title: '제1장' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(sampleChapter);
    });

    it('should pass errors to next', async () => {
      const error = new Error('DB error');
      service.create.mockRejectedValue(error);
      const req = mockReq({ params: { novelId: '10' } as any, body: { title: 'test' } });
      const res = mockRes();

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getById', () => {
    it('should return 200 with chapter', async () => {
      service.findById.mockResolvedValue(sampleChapter);
      const req = mockReq({ params: { novelId: '10', id: '1' } as any });
      const res = mockRes();

      await controller.getById(req, res, next);

      expect(service.findById).toHaveBeenCalledWith(10, 1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(sampleChapter);
    });

    it('should parse novelId and id as integers', async () => {
      service.findById.mockResolvedValue(sampleChapter);
      const req = mockReq({ params: { novelId: '42', id: '7' } as any });
      const res = mockRes();

      await controller.getById(req, res, next);

      expect(service.findById).toHaveBeenCalledWith(42, 7);
    });

    it('should pass errors to next', async () => {
      const error = new Error('Not found');
      service.findById.mockRejectedValue(error);
      const req = mockReq({ params: { novelId: '10', id: '999' } as any });
      const res = mockRes();

      await controller.getById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('update', () => {
    it('should return 200 with updated chapter', async () => {
      const updated = { ...sampleChapter, title: '수정된 제목' };
      service.update.mockResolvedValue(updated);
      const req = mockReq({ params: { novelId: '10', id: '1' } as any, body: { title: '수정된 제목' } });
      const res = mockRes();

      await controller.update(req, res, next);

      expect(service.update).toHaveBeenCalledWith(10, 1, { title: '수정된 제목' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('should pass errors to next', async () => {
      const error = new Error('Not found');
      service.update.mockRejectedValue(error);
      const req = mockReq({ params: { novelId: '10', id: '1' } as any, body: { title: 'x' } });
      const res = mockRes();

      await controller.update(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('delete', () => {
    it('should return 204 with no body', async () => {
      service.delete.mockResolvedValue(true);
      const req = mockReq({ params: { novelId: '10', id: '1' } as any });
      const res = mockRes();

      await controller.delete(req, res, next);

      expect(service.delete).toHaveBeenCalledWith(10, 1);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should pass errors to next', async () => {
      const error = new Error('Not found');
      service.delete.mockRejectedValue(error);
      const req = mockReq({ params: { novelId: '10', id: '1' } as any });
      const res = mockRes();

      await controller.delete(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('reorder', () => {
    it('should return 200 with reordered chapters', async () => {
      const reordered = [
        { ...sampleChapter, id: 2, orderNum: 1 },
        { ...sampleChapter, id: 1, orderNum: 2 },
      ];
      service.reorder.mockResolvedValue(reordered);
      const req = mockReq({ params: { novelId: '10' } as any, body: { chapterIds: [2, 1] } });
      const res = mockRes();

      await controller.reorder(req, res, next);

      expect(service.reorder).toHaveBeenCalledWith(10, [2, 1]);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(reordered);
    });

    it('should pass errors to next', async () => {
      const error = new Error('Validation error');
      service.reorder.mockRejectedValue(error);
      const req = mockReq({ params: { novelId: '10' } as any, body: { chapterIds: [999] } });
      const res = mockRes();

      await controller.reorder(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
