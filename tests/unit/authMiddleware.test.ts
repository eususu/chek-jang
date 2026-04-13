import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

describe('authMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonFn: ReturnType<typeof vi.fn>;
  let statusFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonFn = vi.fn();
    statusFn = vi.fn().mockReturnValue({ json: jsonFn });
    mockRes = { status: statusFn } as Partial<Response>;
    mockNext = vi.fn();
    mockReq = { headers: {} };
  });

  it('should return 401 with token missing message when no Authorization header', async () => {
    vi.doMock('../../src/config', () => ({
      config: { authToken: 'test-secret-token' },
    }));
    const { authMiddleware } = await import('../../src/middleware/auth');

    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(401);
    expect(jsonFn).toHaveBeenCalledWith({ error: '인증 토큰이 필요합니다' });
    expect(mockNext).not.toHaveBeenCalled();

    vi.doUnmock('../../src/config');
  });

  it('should return 401 with token missing message when Authorization header has no Bearer prefix', async () => {
    mockReq.headers = { authorization: 'Basic some-token' };

    vi.doMock('../../src/config', () => ({
      config: { authToken: 'test-secret-token' },
    }));
    const { authMiddleware } = await import('../../src/middleware/auth');

    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(401);
    expect(jsonFn).toHaveBeenCalledWith({ error: '인증 토큰이 필요합니다' });
    expect(mockNext).not.toHaveBeenCalled();

    vi.doUnmock('../../src/config');
  });

  it('should return 401 with auth required message when token does not match', async () => {
    mockReq.headers = { authorization: 'Bearer wrong-token' };

    vi.doMock('../../src/config', () => ({
      config: { authToken: 'test-secret-token' },
    }));
    const { authMiddleware } = await import('../../src/middleware/auth');

    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(401);
    expect(jsonFn).toHaveBeenCalledWith({ error: '인증이 필요합니다' });
    expect(mockNext).not.toHaveBeenCalled();

    vi.doUnmock('../../src/config');
  });

  it('should call next() when token matches', async () => {
    mockReq.headers = { authorization: 'Bearer test-secret-token' };

    vi.doMock('../../src/config', () => ({
      config: { authToken: 'test-secret-token' },
    }));
    const { authMiddleware } = await import('../../src/middleware/auth');

    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(statusFn).not.toHaveBeenCalled();

    vi.doUnmock('../../src/config');
  });
});
