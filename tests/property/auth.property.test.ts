import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { Request, Response, NextFunction } from 'express';

/**
 * Feature: novel-writing-server, Property 13: 인증 미들웨어 - 무효 토큰 거부
 * Validates: Requirements 13.1, 13.3
 *
 * For any API endpoint and any string token that differs from the server's
 * configured token, the request should receive a 401 status code.
 */
describe('Feature: novel-writing-server, Property 13: 인증 미들웨어 - 무효 토큰 거부', () => {
  const CONFIGURED_TOKEN = 'server-secret-token-for-testing';

  let jsonFn: ReturnType<typeof vi.fn>;
  let statusFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
  });

  function createMockRes() {
    jsonFn = vi.fn();
    statusFn = vi.fn().mockReturnValue({ json: jsonFn });
    return { status: statusFn } as unknown as Response;
  }

  it('rejects any Bearer token that differs from the configured authToken with 401', async () => {
    vi.doMock('../../src/config', () => ({
      config: { authToken: CONFIGURED_TOKEN },
    }));
    const { authMiddleware } = await import('../../src/middleware/auth');

    fc.assert(
      fc.property(
        fc.string().filter((token) => token !== CONFIGURED_TOKEN),
        (invalidToken) => {
          const mockRes = createMockRes();
          const mockNext = vi.fn() as NextFunction;
          const mockReq = {
            headers: { authorization: `Bearer ${invalidToken}` },
          } as unknown as Request;

          authMiddleware(mockReq, mockRes, mockNext);

          expect(statusFn).toHaveBeenCalledWith(401);
          expect(jsonFn).toHaveBeenCalledWith({ error: '인증이 필요합니다' });
          expect(mockNext).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});
