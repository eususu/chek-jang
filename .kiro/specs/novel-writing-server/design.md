# 설계 문서

## 개요

소설 작성 기록 관리를 위한 개인용 REST API 서버를 설계한다. Node.js + TypeScript 기반의 Express 서버로 구현하며, PostgreSQL을 영구 저장소로 사용한다. 개인용 서버이므로 단일 사용자 환경을 전제로 하며, 토큰 기반 인증으로 접근을 제어한다.

### 기술 스택 선정 근거

| 기술 | 선정 이유 |
|------|-----------|
| **Node.js + TypeScript** | 타입 안전성과 빠른 개발 속도, REST API 생태계 성숙 |
| **Express.js** | 경량 프레임워크, 미들웨어 패턴으로 인증/에러 처리 용이 |
| **PostgreSQL (pg)** | 관계형 DB, 동시성 및 안정성 우수 |
| **Zod** | 요청 본문 유효성 검증, 타입 추론 자동화 |
| **vitest** | 테스트 프레임워크, fast-check과 호환 |
| **fast-check** | 속성 기반 테스트(PBT) 라이브러리 |

### 데이터베이스 설정

PostgreSQL을 사용하며, `DATABASE_URL` 또는 개별 환경 변수로 연결을 설정한다.

| 환경 변수 | 설명 | 기본값 |
|-----------|------|--------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | - |
| `DB_HOST` | PostgreSQL 호스트 (DATABASE_URL 미사용 시) | `localhost` |
| `DB_PORT` | PostgreSQL 포트 (DATABASE_URL 미사용 시) | `5432` |
| `DB_NAME` | PostgreSQL 데이터베이스 이름 (DATABASE_URL 미사용 시) | `novels` |
| `DB_USER` | PostgreSQL 사용자 (DATABASE_URL 미사용 시) | `postgres` |
| `DB_PASSWORD` | PostgreSQL 비밀번호 (DATABASE_URL 미사용 시) | - |

`DATABASE_URL`이 설정되어 있으면 이를 우선 사용하고, 없으면 개별 환경 변수(`DB_HOST`, `DB_PORT` 등)를 조합하여 연결한다.

**설정 예시 (.env)**:
```bash
# PostgreSQL - 연결 문자열 방식
DATABASE_URL=postgresql://user:password@localhost:5432/novels

# PostgreSQL - 개별 설정 방식
DB_HOST=my-db-server.example.com
DB_PORT=5432
DB_NAME=novels
DB_USER=novelist
DB_PASSWORD=secret
```

## 아키텍처

### 계층 구조

```mermaid
graph TD
    Client[클라이언트] -->|HTTP 요청| MW[미들웨어 계층]
    MW -->|인증 검증| AUTH[인증 미들웨어]
    MW -->|JSON 파싱| PARSE[Body Parser]
    MW --> ROUTER[라우터 계층]
    ROUTER --> NC[소설 컨트롤러]
    ROUTER --> CC[챕터 컨트롤러]
    NC --> NS[소설 서비스]
    CC --> CS[챕터 서비스]
    NS --> NR[소설 리포지토리]
    CS --> CR[챕터 리포지토리]
    NR --> PG[(PostgreSQL DB)]
    CR --> PG
```

### 계층별 책임

- **미들웨어 계층**: 인증 토큰 검증, JSON 파싱, 에러 핸들링
- **라우터 계층**: HTTP 메서드와 경로를 컨트롤러에 매핑
- **컨트롤러 계층**: 요청 파싱, 유효성 검증, 응답 포맷팅
- **서비스 계층**: 비즈니스 로직 (순서 재정렬, 날짜 자동 기록 등)
- **리포지토리 계층**: 데이터베이스 CRUD 연산

### 디렉토리 구조

```
src/
├── app.ts                 # Express 앱 설정
├── server.ts              # 서버 시작점
├── config.ts              # 환경 변수 설정 (DB 설정 포함)
├── database/
│   ├── index.ts           # DB 클라이언트 생성 및 초기화
│   └── database.ts        # PostgreSQL 클라이언트 구현
├── middleware/
│   ├── auth.ts            # 인증 미들웨어
│   ├── errorHandler.ts    # 전역 에러 핸들러
│   └── validateBody.ts    # 요청 본문 유효성 검증
├── routes/
│   ├── novelRoutes.ts     # 소설 라우트
│   └── chapterRoutes.ts   # 챕터 라우트
├── controllers/
│   ├── novelController.ts
│   └── chapterController.ts
├── services/
│   ├── novelService.ts
│   └── chapterService.ts
├── repositories/
│   ├── novelRepository.ts       # 소설 리포지토리
│   └── chapterRepository.ts     # 챕터 리포지토리
├── schemas/
│   ├── novelSchemas.ts    # Zod 스키마 (소설)
│   └── chapterSchemas.ts  # Zod 스키마 (챕터)
└── types/
    └── index.ts           # 공통 타입 정의
```

## 컴포넌트 및 인터페이스

### 1. 인증 미들웨어 (`middleware/auth.ts`)

```typescript
// 환경 변수 AUTH_TOKEN과 요청 헤더의 Authorization 값을 비교
// 형식: Authorization: Bearer <token>
function authMiddleware(req: Request, res: Response, next: NextFunction): void
```

- 토큰 누락 시: `401 { error: "인증 토큰이 필요합니다" }`
- 토큰 불일치 시: `401 { error: "인증이 필요합니다" }`

### 2. 요청 유효성 검증 미들웨어 (`middleware/validateBody.ts`)

```typescript
// Zod 스키마를 받아 요청 본문을 검증하는 미들웨어 팩토리
function validateBody(schema: ZodSchema): RequestHandler
```

- JSON 파싱 실패 시: `400 { error: "유효한 JSON 형식이 아닙니다" }`
- 스키마 검증 실패 시: `400 { error: "...", details: [...] }`

### 3. 소설 컨트롤러 (`controllers/novelController.ts`)

```typescript
class NovelController {
  create(req: Request, res: Response, next: NextFunction): void    // POST /novels
  list(req: Request, res: Response, next: NextFunction): void      // GET /novels
  getById(req: Request, res: Response, next: NextFunction): void   // GET /novels/:id
  update(req: Request, res: Response, next: NextFunction): void    // PUT /novels/:id
  delete(req: Request, res: Response, next: NextFunction): void    // DELETE /novels/:id
}
```

### 4. 챕터 컨트롤러 (`controllers/chapterController.ts`)

```typescript
class ChapterController {
  create(req: Request, res: Response, next: NextFunction): void        // POST /novels/:novelId/chapters
  getById(req: Request, res: Response, next: NextFunction): void       // GET /novels/:novelId/chapters/:id
  update(req: Request, res: Response, next: NextFunction): void        // PUT /novels/:novelId/chapters/:id
  delete(req: Request, res: Response, next: NextFunction): void        // DELETE /novels/:novelId/chapters/:id
  reorder(req: Request, res: Response, next: NextFunction): void       // PUT /novels/:novelId/chapters/reorder
}
```

### 5. 소설 서비스 (`services/novelService.ts`)

```typescript
class NovelService {
  constructor(private novelRepo: NovelRepository, private chapterRepo: ChapterRepository)
  create(data: CreateNovelInput): Promise<Novel>
  findAll(): Promise<NovelSummary[]>
  findById(id: number): Promise<NovelDetail | null>
  update(id: number, data: UpdateNovelInput): Promise<Novel | null>
  delete(id: number): Promise<boolean>
}
```

### 6. 챕터 서비스 (`services/chapterService.ts`)

```typescript
class ChapterService {
  constructor(private novelRepo: NovelRepository, private chapterRepo: ChapterRepository)
  create(novelId: number, data: CreateChapterInput): Promise<Chapter>
  findById(novelId: number, chapterId: number): Promise<Chapter | null>
  update(novelId: number, chapterId: number, data: UpdateChapterInput): Promise<Chapter | null>
  delete(novelId: number, chapterId: number): Promise<boolean>
  reorder(novelId: number, chapterIds: number[]): Promise<Chapter[]>
}
```

### 7. 데이터베이스 클라이언트 (`database/database.ts`)

```typescript
// PostgreSQL 클라이언트 - pg 라이브러리를 사용하여 쿼리를 실행
class Database {
  constructor(config: DatabaseConfig)
  // 단일 행 반환 쿼리
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  // 다중 행 반환 쿼리
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  // INSERT/UPDATE/DELETE 등 실행 쿼리
  run(sql: string, params?: unknown[]): Promise<{ lastInsertRowId: number; changes: number }>;
  // 트랜잭션 실행
  transaction<T>(fn: (client: Database) => Promise<T>): Promise<T>;
  // 스키마 초기화
  initialize(): Promise<void>;
  // 연결 종료
  close(): Promise<void>;
}
```

### 8. 리포지토리 (`repositories/`)

```typescript
// 소설 리포지토리 - PostgreSQL을 사용한 소설 CRUD
class NovelRepository {
  constructor(private db: Database)
  insert(data: { title: string; description?: string }): Promise<Novel>;
  findAll(): Promise<NovelSummary[]>;
  findById(id: number): Promise<Novel | null>;
  update(id: number, data: { title?: string; description?: string }): Promise<Novel | null>;
  delete(id: number): Promise<boolean>;
}

// 챕터 리포지토리 - PostgreSQL을 사용한 챕터 CRUD
class ChapterRepository {
  constructor(private db: Database)
  insert(data: { novelId: number; title: string; content?: string }): Promise<Chapter>;
  findByNovelId(novelId: number): Promise<ChapterSummary[]>;
  findById(novelId: number, chapterId: number): Promise<Chapter | null>;
  update(novelId: number, chapterId: number, data: { title?: string; content?: string }): Promise<Chapter | null>;
  delete(novelId: number, chapterId: number): Promise<boolean>;
  getMaxOrder(novelId: number): Promise<number>;
  updateOrders(novelId: number, orderMap: Array<{ id: number; order: number }>): Promise<void>;
  deleteByNovelId(novelId: number): Promise<void>;
}
```

리포지토리는 `Database` 인스턴스를 생성자에서 주입받아 사용한다.

## 데이터 모델

### ERD

```mermaid
erDiagram
    NOVEL {
        INTEGER id PK "자동 증가"
        VARCHAR_200 title "NOT NULL, 최대 200자"
        VARCHAR_1000 description "기본값: 빈 문자열, 최대 1000자"
        TIMESTAMPTZ created_at "자동 기록"
        TIMESTAMPTZ updated_at "자동 기록"
    }
    CHAPTER {
        INTEGER id PK "자동 증가"
        INTEGER novel_id FK "NOT NULL"
        VARCHAR_200 title "NOT NULL, 최대 200자"
        TEXT content "기본값: 빈 문자열"
        INTEGER order_num "NOT NULL"
        TIMESTAMPTZ created_at "자동 기록"
        TIMESTAMPTZ updated_at "자동 기록"
    }
    NOVEL ||--o{ CHAPTER : "has"
```

### DDL

```sql
CREATE TABLE IF NOT EXISTS novels (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description VARCHAR(1000) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chapters (
  id SERIAL PRIMARY KEY,
  novel_id INTEGER NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  order_num INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chapters_novel_id ON chapters(novel_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(novel_id, order_num);
```

### TypeScript 타입 정의

```typescript
// 데이터베이스 설정 타입
interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}

// 소설 관련 타입
interface Novel {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface NovelSummary {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface NovelDetail extends Novel {
  chapters: ChapterSummary[];
}

// Zod 스키마에서 maxLength 검증 적용:
//   title: z.string().min(1).max(200)
//   description: z.string().max(1000)
//   chapter title: z.string().min(1).max(200)
//   chapter content: z.string() (길이 제한 없음 - 소설 본문)
interface CreateNovelInput {
  title: string;        // 최대 200자
  description?: string; // 최대 1000자
}

interface UpdateNovelInput {
  title?: string;        // 최대 200자
  description?: string;  // 최대 1000자
}

// 챕터 관련 타입
interface Chapter {
  id: number;
  novelId: number;
  title: string;   // 최대 200자
  content: string; // 길이 제한 없음 (소설 본문)
  orderNum: number;
  createdAt: string;
  updatedAt: string;
}

interface ChapterSummary {
  id: number;
  title: string;   // 최대 200자
  orderNum: number;
}

interface CreateChapterInput {
  title: string;    // 최대 200자
  content?: string; // 길이 제한 없음 (소설 본문)
}

interface UpdateChapterInput {
  title?: string;    // 최대 200자
  content?: string;  // 길이 제한 없음 (소설 본문)
}

interface ReorderChaptersInput {
  chapterIds: number[];
}
```

### API 엔드포인트 요약

| 메서드 | 경로 | 설명 | 성공 코드 |
|--------|------|------|-----------|
| POST | /novels | 소설 생성 | 201 |
| GET | /novels | 소설 목록 조회 | 200 |
| GET | /novels/:id | 소설 상세 조회 | 200 |
| PUT | /novels/:id | 소설 정보 수정 | 200 |
| DELETE | /novels/:id | 소설 삭제 | 204 |
| POST | /novels/:novelId/chapters | 챕터 생성 | 201 |
| GET | /novels/:novelId/chapters/:id | 챕터 상세 조회 | 200 |
| PUT | /novels/:novelId/chapters/:id | 챕터 내용 수정 | 200 |
| DELETE | /novels/:novelId/chapters/:id | 챕터 삭제 | 204 |
| PUT | /novels/:novelId/chapters/reorder | 챕터 순서 변경 | 200 |

### 응답 형식 예시

**성공 응답 (소설 생성)**:
```json
{
  "id": 1,
  "title": "나의 첫 소설",
  "description": "판타지 장편 소설",
  "createdAt": "2024-01-15T09:00:00.000Z",
  "updatedAt": "2024-01-15T09:00:00.000Z"
}
```

**오류 응답**:
```json
{
  "error": "소설을 찾을 수 없습니다"
}
```

**유효성 검증 오류 응답**:
```json
{
  "error": "요청 데이터가 유효하지 않습니다",
  "details": [
    { "field": "title", "message": "제목은 필수 항목입니다" }
  ]
}
```

## 정확성 속성 (Correctness Properties)

*속성(Property)이란 시스템의 모든 유효한 실행에서 참이어야 하는 특성 또는 동작을 의미한다. 속성은 사람이 읽을 수 있는 명세와 기계가 검증할 수 있는 정확성 보장 사이의 다리 역할을 한다.*

### Property 1: 소설 생성 라운드 트립

*For any* 유효한 소설 입력(제목, 설명), 소설을 생성한 후 해당 ID로 조회하면 생성 시 입력한 제목과 설명이 동일하게 반환되어야 하며, createdAt과 updatedAt이 유효한 ISO 8601 타임스탬프이고 서로 같아야 한다.

**Validates: Requirements 1.1, 1.3**

### Property 2: 스키마 유효성 검증 - 필수 필드 누락 거부

*For any* 제목(title) 필드가 누락된 객체에 대해, 소설 생성 스키마와 챕터 생성 스키마 모두 해당 입력을 거부하고 누락된 필드를 명시하는 오류를 반환해야 한다.

**Validates: Requirements 1.2, 6.2**

### Property 3: 소설 목록 완전성

*For any* N개(N ≥ 0)의 소설을 생성한 후, 소설 목록 조회 시 정확히 N개의 소설이 반환되어야 하며, 생성한 모든 소설의 제목이 목록에 포함되어야 한다.

**Validates: Requirements 2.1, 2.2**

### Property 4: 소설 상세 조회 시 챕터 포함

*For any* 소설과 해당 소설에 속한 M개의 챕터에 대해, 소설 상세 조회 시 소설 메타데이터와 함께 정확히 M개의 챕터 요약 정보가 순서대로 반환되어야 한다.

**Validates: Requirements 3.1**

### Property 5: 소설 수정 적용 및 수정일 갱신

*For any* 기존 소설과 유효한 수정 입력(제목 또는 설명)에 대해, 수정 후 반환된 소설은 수정 요청의 필드가 반영되어야 하며, updatedAt이 원래 값보다 같거나 이후여야 한다.

**Validates: Requirements 4.1, 4.2**

### Property 6: 소설 삭제 시 연쇄 삭제

*For any* 소설과 해당 소설에 속한 임의 개수의 챕터에 대해, 소설을 삭제하면 해당 소설과 모든 챕터가 데이터베이스에서 제거되어 더 이상 조회할 수 없어야 한다.

**Validates: Requirements 5.1**

### Property 7: 챕터 생성 라운드 트립 및 자동 순서 부여

*For any* 기존 소설에 N개의 챕터를 순차적으로 생성할 때, 각 챕터는 1부터 N까지의 순서 번호를 자동으로 부여받아야 하며, 생성 후 조회 시 제목과 본문이 입력값과 동일해야 한다.

**Validates: Requirements 6.1, 6.3, 7.1**

### Property 8: 챕터 수정 적용 및 수정일 갱신

*For any* 기존 챕터와 유효한 수정 입력(제목 또는 본문)에 대해, 수정 후 반환된 챕터는 수정 요청의 필드가 반영되어야 하며, updatedAt이 원래 값보다 같거나 이후여야 한다.

**Validates: Requirements 8.1, 8.2**

### Property 9: 챕터 삭제 후 순서 재정렬

*For any* N개의 챕터를 가진 소설에서 임의의 챕터를 삭제하면, 나머지 N-1개의 챕터는 1부터 N-1까지 연속된 순서 번호를 가져야 하며, 원래의 상대적 순서가 유지되어야 한다.

**Validates: Requirements 9.1, 9.2**

### Property 10: 챕터 순서 변경 순열 적용

*For any* N개의 챕터를 가진 소설과 해당 챕터 ID의 임의 순열에 대해, 순서 변경 요청 후 챕터들의 순서가 요청된 순열과 일치해야 한다.

**Validates: Requirements 10.1**

### Property 11: 순서 변경 시 유효하지 않은 챕터 ID 거부

*For any* 소설에 속하지 않는 챕터 ID가 포함된 순서 변경 요청에 대해, 서비스는 해당 요청을 거부하고 유효하지 않은 챕터 ID를 명시하는 오류를 반환해야 한다.

**Validates: Requirements 10.2**

### Property 12: 유효하지 않은 JSON 거부

*For any* 유효한 JSON이 아닌 문자열을 요청 본문으로 전송하면, 서버는 400 상태 코드와 형식 오류 메시지를 반환해야 한다.

**Validates: Requirements 11.4**

### Property 13: 인증 미들웨어 - 무효 토큰 거부

*For any* API 엔드포인트와 서버에 설정된 토큰과 다른 임의의 문자열 토큰에 대해, 해당 토큰으로 요청하면 401 상태 코드를 반환해야 한다.

**Validates: Requirements 13.1, 13.3**

## 에러 처리

### 에러 처리 전략

전역 에러 핸들러 미들웨어를 통해 일관된 에러 응답 형식을 보장한다.

### 에러 유형 및 응답

| 에러 유형 | HTTP 상태 코드 | 응답 형식 |
|-----------|---------------|-----------|
| 인증 실패 (토큰 누락/불일치) | 401 | `{ "error": "인증 토큰이 필요합니다" }` |
| 유효성 검증 실패 (필수 필드 누락) | 400 | `{ "error": "...", "details": [...] }` |
| JSON 파싱 실패 | 400 | `{ "error": "유효한 JSON 형식이 아닙니다" }` |
| 리소스 미발견 | 404 | `{ "error": "소설을 찾을 수 없습니다" }` |
| 비즈니스 규칙 위반 (잘못된 챕터 ID) | 400 | `{ "error": "...", "details": [...] }` |
| 서버 내부 오류 | 500 | `{ "error": "서버 내부 오류가 발생했습니다" }` |

### 에러 처리 흐름

```mermaid
graph TD
    REQ[요청 수신] --> AUTH{인증 검증}
    AUTH -->|실패| E401[401 응답]
    AUTH -->|성공| PARSE{JSON 파싱}
    PARSE -->|실패| E400A[400 - JSON 오류]
    PARSE -->|성공| VALIDATE{스키마 검증}
    VALIDATE -->|실패| E400B[400 - 유효성 오류]
    VALIDATE -->|성공| LOGIC[비즈니스 로직]
    LOGIC -->|리소스 없음| E404[404 응답]
    LOGIC -->|규칙 위반| E400C[400 - 비즈니스 오류]
    LOGIC -->|예외 발생| E500[500 응답]
    LOGIC -->|성공| SUCCESS[성공 응답]
```

### 커스텀 에러 클래스

```typescript
class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource}을(를) 찾을 수 없습니다`);
  }
}

class ValidationError extends AppError {
  constructor(details: Array<{ field: string; message: string }>) {
    super(400, "요청 데이터가 유효하지 않습니다", details);
  }
}
```

## 테스트 전략

### 이중 테스트 접근법

이 프로젝트는 **단위 테스트**와 **속성 기반 테스트(PBT)**를 병행하여 포괄적인 테스트 커버리지를 확보한다.

### 속성 기반 테스트 (Property-Based Testing)

- **라이브러리**: fast-check (vitest와 함께 사용)
- **최소 반복 횟수**: 속성당 100회
- **태그 형식**: `Feature: novel-writing-server, Property {번호}: {속성 설명}`
- **대상**: 위 정확성 속성 섹션의 13개 속성

각 속성은 서비스 계층을 대상으로 테스트한다. 테스트용 PostgreSQL 데이터베이스를 사용하여 테스트 간 격리를 보장하며, 각 테스트 실행 전 스키마를 초기화한다.

### 단위 테스트 (Example-Based)

단위 테스트는 속성 테스트로 커버하기 어려운 구체적 시나리오에 집중한다:

- **빈 목록 조회** (요구사항 2.2): 소설이 없을 때 빈 배열 반환
- **존재하지 않는 리소스 접근** (요구사항 3.2, 4.3, 5.2, 6.4, 7.2, 8.3, 9.3): 404 응답 확인
- **HTTP 상태 코드 검증** (요구사항 11.3): 각 엔드포인트별 올바른 상태 코드
- **인증 토큰 누락** (요구사항 13.4): Authorization 헤더 없는 요청 시 401
- **유효한 토큰 통과** (요구사항 13.2): 올바른 토큰으로 정상 처리

### 통합 테스트

- **데이터 영속성** (요구사항 12.1, 12.2): 서버 재시작 후 데이터 유지 확인
- **엔드투엔드 API 흐름**: supertest를 사용한 HTTP 레벨 통합 테스트

### 테스트 디렉토리 구조

```
tests/
├── unit/
│   ├── novelService.test.ts
│   ├── chapterService.test.ts
│   ├── authMiddleware.test.ts
│   └── schemas.test.ts
├── property/
│   ├── novelService.property.test.ts
│   ├── chapterService.property.test.ts
│   ├── validation.property.test.ts
│   └── auth.property.test.ts
└── integration/
    ├── novelApi.integration.test.ts
    ├── chapterApi.integration.test.ts
    └── persistence.integration.test.ts
```

### 스모크 테스트

- **JSON Content-Type** (요구사항 11.1): 응답 헤더에 application/json 포함 확인
- **RESTful 경로** (요구사항 11.2): 라우트 패턴 일치 확인
- **환경 변수 설정** (요구사항 13.5): AUTH_TOKEN 환경 변수 인식 확인
