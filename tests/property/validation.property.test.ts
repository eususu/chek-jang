import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createNovelSchema } from '../../src/schemas/novelSchemas';
import { createChapterSchema } from '../../src/schemas/chapterSchemas';

/**
 * Feature: novel-writing-server, Property 2: 스키마 유효성 검증 - 필수 필드 누락 거부
 * Validates: Requirements 1.2, 6.2
 *
 * For any object missing the title field, both the novel creation schema
 * and chapter creation schema should reject the input and return errors
 * specifying the missing field.
 */
describe('Feature: novel-writing-server, Property 2: 스키마 유효성 검증 - 필수 필드 누락 거부', () => {
  it('createNovelSchema rejects any object missing the title field', () => {
    fc.assert(
      fc.property(
        fc.record({
          description: fc.oneof(fc.string(), fc.constant(undefined)),
        }).map(({ description }) => {
          // Build an object that has no title field, but may have other fields
          const obj: Record<string, unknown> = {};
          if (description !== undefined) {
            obj.description = description;
          }
          return obj;
        }),
        (input) => {
          const result = createNovelSchema.safeParse(input);
          expect(result.success).toBe(false);
          if (!result.success) {
            const fieldNames = result.error.issues.map((issue) => issue.path.join('.'));
            expect(fieldNames).toContain('title');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('createChapterSchema rejects any object missing the title field', () => {
    fc.assert(
      fc.property(
        fc.record({
          content: fc.oneof(fc.string(), fc.constant(undefined)),
        }).map(({ content }) => {
          const obj: Record<string, unknown> = {};
          if (content !== undefined) {
            obj.content = content;
          }
          return obj;
        }),
        (input) => {
          const result = createChapterSchema.safeParse(input);
          expect(result.success).toBe(false);
          if (!result.success) {
            const fieldNames = result.error.issues.map((issue) => issue.path.join('.'));
            expect(fieldNames).toContain('title');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';

/**
 * Feature: novel-writing-server, Property 12: 유효하지 않은 JSON 거부
 * Validates: Requirements 11.4
 *
 * For any string that is NOT valid JSON, when sent as a request body
 * with Content-Type: application/json, the server should return a 400
 * status code with a format error message.
 */
describe('Feature: novel-writing-server, Property 12: 유효하지 않은 JSON 거부', () => {
  function createTestApp() {
    const app = express();
    app.use(express.json());
    app.post('/test', (_req: Request, res: Response) => {
      res.json({ ok: true });
    });
    // Error handler for JSON parse failures
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if (err.type === 'entity.parse.failed') {
        res.status(400).json({ error: '유효한 JSON 형식이 아닙니다' });
      } else {
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다' });
      }
    });
    return app;
  }

  /**
   * Arbitrary that generates strings which are NOT valid JSON.
   * Strategies:
   * 1. Strings with unbalanced braces/brackets
   * 2. Strings with trailing commas
   * 3. Single-quoted strings (invalid JSON)
   * 4. Random non-empty strings that fail JSON.parse
   */
  const invalidJsonArb = fc
    .oneof(
      // Unbalanced braces / brackets
      fc.constantFrom('{', '{ "a": 1', '[1, 2', '{"key": }', '{]'),
      // Trailing commas
      fc.constantFrom('{"a": 1,}', '[1,]', '{"a": 1, "b": 2,}'),
      // Single-quoted strings (invalid in JSON)
      fc.constantFrom("{'key': 'value'}", "{'a': 1}"),
      // Random strings from JSON-like characters (not valid JSON)
      fc.array(fc.constantFrom('a', 'b', 'c', '1', '2', '{', '}', ':', ',', "'"), { minLength: 1, maxLength: 50 }).map((chars) => chars.join('')),
      // Bare words
      fc.constantFrom('undefined', 'NaN', 'Infinity', 'hello world', 'true false'),
    )
    .filter((s) => {
      // Ensure the string is truly not valid JSON
      try {
        JSON.parse(s);
        return false;
      } catch {
        return true;
      }
    })
    // Must be non-empty (empty string is not sent as a body by Express)
    .filter((s) => s.trim().length > 0);

  it('rejects any non-JSON string with 400 and format error message', async () => {
    const app = createTestApp();

    await fc.assert(
      fc.asyncProperty(invalidJsonArb, async (invalidJson) => {
        const res = await request(app)
          .post('/test')
          .set('Content-Type', 'application/json')
          .send(invalidJson);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', '유효한 JSON 형식이 아닙니다');
      }),
      { numRuns: 100 },
    );
  });
});
