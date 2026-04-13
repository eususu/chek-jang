# 구현 계획: 소설 작성 기록 관리 서버

## 개요

Node.js + TypeScript + Express + PostgreSQL 기반의 소설 작성 기록 관리 REST API 서버를 구현한다. 프로젝트 초기 설정부터 시작하여 데이터 계층, 비즈니스 로직, API 계층 순으로 점진적으로 구축하며, 각 단계에서 속성 기반 테스트와 단위 테스트로 정확성을 검증한다.

## Tasks

- [x] 1. 프로젝트 초기 설정 및 공통 타입 정의
  - [x] 1.1 프로젝트 구조 생성 및 의존성 설치
    - `package.json` 생성 및 의존성 설치: express, pg, zod, dotenv (런타임), typescript, @types/express, @types/pg, vitest, fast-check, supertest, @types/supertest (개발)
    - `tsconfig.json` 설정 (strict 모드, ESM 또는 CommonJS 설정)
    - 설계 문서의 디렉토리 구조에 따라 `src/` 하위 폴더 생성
    - _요구사항: 11.1, 11.2_

  - [x] 1.2 공통 타입 및 에러 클래스 정의
    - `src/types/index.ts`에 Novel, NovelSummary, NovelDetail, Chapter, ChapterSummary 등 모든 인터페이스 정의
    - CreateNovelInput, UpdateNovelInput, CreateChapterInput, UpdateChapterInput, ReorderChaptersInput 타입 정의
    - DatabaseConfig 인터페이스 정의
    - `src/errors.ts`에 AppError, NotFoundError, ValidationError 커스텀 에러 클래스 구현
    - _요구사항: 1.1, 6.1, 11.3_

  - [x] 1.3 환경 변수 설정 모듈 구현
    - `src/config.ts`에 DATABASE_URL 또는 개별 DB 환경 변수(DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD) 로딩
    - AUTH_TOKEN 환경 변수 로딩
    - PORT 환경 변수 로딩 (기본값 설정)
    - dotenv를 사용한 `.env` 파일 지원
    - _요구사항: 12.1, 13.5_

- [x] 2. 데이터베이스 계층 구현
  - [x] 2.1 PostgreSQL 데이터베이스 클라이언트 구현
    - `src/database/database.ts`에 Database 클래스 구현
    - pg Pool을 사용한 get, all, run, transaction, initialize, close 메서드 구현
    - `src/database/index.ts`에 DB 인스턴스 생성 및 내보내기
    - initialize()에서 DDL 실행하여 novels, chapters 테이블 및 인덱스 생성
    - _요구사항: 12.1, 12.2_

  - [x] 2.2 소설 리포지토리 구현
    - `src/repositories/novelRepository.ts`에 NovelRepository 클래스 구현
    - insert, findAll, findById, update, delete 메서드 구현
    - DB 컬럼명(snake_case)을 TypeScript 필드명(camelCase)으로 매핑
    - _요구사항: 1.1, 2.1, 3.1, 4.1, 5.1_

  - [x] 2.3 챕터 리포지토리 구현
    - `src/repositories/chapterRepository.ts`에 ChapterRepository 클래스 구현
    - insert, findByNovelId, findById, update, delete, getMaxOrder, updateOrders, deleteByNovelId 메서드 구현
    - DB 컬럼명(snake_case)을 TypeScript 필드명(camelCase)으로 매핑
    - _요구사항: 6.1, 7.1, 8.1, 9.1, 10.1_

- [x] 3. Zod 유효성 검증 스키마 정의
  - [x] 3.1 소설 및 챕터 Zod 스키마 구현
    - `src/schemas/novelSchemas.ts`에 createNovelSchema(title: min(1).max(200), description: max(1000) optional), updateNovelSchema 정의
    - `src/schemas/chapterSchemas.ts`에 createChapterSchema(title: min(1).max(200), content: optional), updateChapterSchema, reorderChaptersSchema 정의
    - _요구사항: 1.2, 6.2, 10.1_

  - [x] 3.2 스키마 유효성 검증 속성 테스트 작성
    - **Property 2: 스키마 유효성 검증 - 필수 필드 누락 거부**
    - **검증 대상: 요구사항 1.2, 6.2**

- [x] 4. 체크포인트 - 데이터 계층 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의한다.

- [x] 5. 서비스 계층 구현
  - [x] 5.1 소설 서비스 구현
    - `src/services/novelService.ts`에 NovelService 클래스 구현
    - create: 소설 생성 후 반환
    - findAll: 전체 소설 목록 반환
    - findById: 소설 상세 + 챕터 목록 반환 (NovelDetail), 미존재 시 NotFoundError
    - update: 소설 수정 후 반환, 미존재 시 NotFoundError
    - delete: 소설 삭제 (CASCADE로 챕터 자동 삭제), 미존재 시 NotFoundError
    - _요구사항: 1.1, 1.3, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 4.3, 5.1, 5.2_

  - [x] 5.2 소설 서비스 속성 테스트 작성
    - **Property 1: 소설 생성 라운드 트립**
    - **검증 대상: 요구사항 1.1, 1.3**

  - [x] 5.3 소설 목록 완전성 속성 테스트 작성
    - **Property 3: 소설 목록 완전성**
    - **검증 대상: 요구사항 2.1, 2.2**

  - [x] 5.4 소설 상세 조회 시 챕터 포함 속성 테스트 작성
    - **Property 4: 소설 상세 조회 시 챕터 포함**
    - **검증 대상: 요구사항 3.1**

  - [x] 5.5 소설 수정 적용 및 수정일 갱신 속성 테스트 작성
    - **Property 5: 소설 수정 적용 및 수정일 갱신**
    - **검증 대상: 요구사항 4.1, 4.2**

  - [x] 5.6 소설 삭제 시 연쇄 삭제 속성 테스트 작성
    - **Property 6: 소설 삭제 시 연쇄 삭제**
    - **검증 대상: 요구사항 5.1**

  - [x] 5.7 챕터 서비스 구현
    - `src/services/chapterService.ts`에 ChapterService 클래스 구현
    - create: 소설 존재 확인 후 챕터 생성, 자동 순서 부여 (getMaxOrder + 1)
    - findById: 챕터 조회, 미존재 시 NotFoundError
    - update: 챕터 수정 후 반환, 미존재 시 NotFoundError
    - delete: 챕터 삭제 후 나머지 챕터 순서 재정렬
    - reorder: 챕터 ID 목록 유효성 검증 후 순서 변경 (트랜잭션)
    - _요구사항: 6.1, 6.3, 6.4, 7.1, 7.2, 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 10.1, 10.2_

  - [x] 5.8 챕터 생성 라운드 트립 및 자동 순서 부여 속성 테스트 작성
    - **Property 7: 챕터 생성 라운드 트립 및 자동 순서 부여**
    - **검증 대상: 요구사항 6.1, 6.3, 7.1**

  - [x] 5.9 챕터 수정 적용 및 수정일 갱신 속성 테스트 작성
    - **Property 8: 챕터 수정 적용 및 수정일 갱신**
    - **검증 대상: 요구사항 8.1, 8.2**

  - [x] 5.10 챕터 삭제 후 순서 재정렬 속성 테스트 작성
    - **Property 9: 챕터 삭제 후 순서 재정렬**
    - **검증 대상: 요구사항 9.1, 9.2**

  - [x] 5.11 챕터 순서 변경 순열 적용 속성 테스트 작성
    - **Property 10: 챕터 순서 변경 순열 적용**
    - **검증 대상: 요구사항 10.1**

  - [x] 5.12 순서 변경 시 유효하지 않은 챕터 ID 거부 속성 테스트 작성
    - **Property 11: 순서 변경 시 유효하지 않은 챕터 ID 거부**
    - **검증 대상: 요구사항 10.2**

- [x] 6. 체크포인트 - 서비스 계층 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의한다.

- [x] 7. 미들웨어 구현
  - [x] 7.1 인증 미들웨어 구현
    - `src/middleware/auth.ts`에 authMiddleware 함수 구현
    - Authorization 헤더에서 Bearer 토큰 추출
    - 토큰 누락 시 401 + "인증 토큰이 필요합니다" 응답
    - 토큰 불일치 시 401 + "인증이 필요합니다" 응답
    - _요구사항: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 7.2 인증 미들웨어 속성 테스트 작성
    - **Property 13: 인증 미들웨어 - 무효 토큰 거부**
    - **검증 대상: 요구사항 13.1, 13.3**

  - [x] 7.3 요청 본문 유효성 검증 미들웨어 구현
    - `src/middleware/validateBody.ts`에 validateBody 미들웨어 팩토리 구현
    - Zod 스키마를 받아 req.body 검증
    - 검증 실패 시 400 + 오류 상세 응답
    - _요구사항: 1.2, 6.2, 11.4_

  - [x] 7.4 유효하지 않은 JSON 거부 속성 테스트 작성
    - **Property 12: 유효하지 않은 JSON 거부**
    - **검증 대상: 요구사항 11.4**

  - [x] 7.5 전역 에러 핸들러 미들웨어 구현
    - `src/middleware/errorHandler.ts`에 에러 핸들러 구현
    - AppError 인스턴스는 해당 statusCode와 메시지로 응답
    - 예상치 못한 에러는 500 + "서버 내부 오류가 발생했습니다" 응답
    - _요구사항: 11.3, 11.4_

- [x] 8. 컨트롤러 및 라우터 구현
  - [x] 8.1 소설 컨트롤러 및 라우터 구현
    - `src/controllers/novelController.ts`에 NovelController 클래스 구현 (create, list, getById, update, delete)
    - `src/routes/novelRoutes.ts`에 라우트 매핑: POST/GET /novels, GET/PUT/DELETE /novels/:id
    - 각 라우트에 validateBody 미들웨어 적용 (POST, PUT)
    - 응답 상태 코드: 생성 201, 조회 200, 수정 200, 삭제 204
    - _요구사항: 1.1, 2.1, 3.1, 4.1, 5.1, 11.2, 11.3_

  - [x] 8.2 챕터 컨트롤러 및 라우터 구현
    - `src/controllers/chapterController.ts`에 ChapterController 클래스 구현 (create, getById, update, delete, reorder)
    - `src/routes/chapterRoutes.ts`에 라우트 매핑: POST /novels/:novelId/chapters, GET/PUT/DELETE /novels/:novelId/chapters/:id, PUT /novels/:novelId/chapters/reorder
    - 각 라우트에 validateBody 미들웨어 적용 (POST, PUT)
    - 응답 상태 코드: 생성 201, 조회 200, 수정 200, 삭제 204
    - _요구사항: 6.1, 7.1, 8.1, 9.1, 10.1, 11.2, 11.3_

- [x] 9. Express 앱 조립 및 서버 시작점 구현
  - [x] 9.1 Express 앱 설정
    - `src/app.ts`에 Express 앱 생성
    - JSON 파싱 미들웨어 적용 (잘못된 JSON 시 400 응답 처리)
    - 인증 미들웨어 전역 적용
    - 소설 라우터, 챕터 라우터 등록
    - 전역 에러 핸들러 등록
    - _요구사항: 11.1, 11.2, 13.1_

  - [x] 9.2 서버 시작점 구현
    - `src/server.ts`에 데이터베이스 초기화 후 서버 시작 로직 구현
    - 환경 변수에서 포트 읽기
    - 종료 시 DB 연결 정리 (graceful shutdown)
    - _요구사항: 12.1, 12.2_

- [x] 10. 체크포인트 - 통합 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의한다.

- [x] 11. 단위 테스트 작성
  - [x] 11.1 소설 서비스 단위 테스트 작성
    - 빈 목록 조회 시 빈 배열 반환 테스트
    - 존재하지 않는 소설 조회/수정/삭제 시 NotFoundError 테스트
    - _요구사항: 2.2, 3.2, 4.3, 5.2_

  - [x] 11.2 챕터 서비스 단위 테스트 작성
    - 존재하지 않는 소설에 챕터 생성 시 NotFoundError 테스트
    - 존재하지 않는 챕터 조회/수정/삭제 시 NotFoundError 테스트
    - _요구사항: 6.4, 7.2, 8.3, 9.3_

  - [x] 11.3 인증 미들웨어 단위 테스트 작성
    - 토큰 누락 시 401 응답 테스트
    - 유효한 토큰 시 정상 통과 테스트
    - _요구사항: 13.2, 13.4_

  - [x] 11.4 통합 테스트 작성
    - supertest를 사용한 소설 API 엔드투엔드 흐름 테스트
    - supertest를 사용한 챕터 API 엔드투엔드 흐름 테스트
    - HTTP 상태 코드 검증 (201, 200, 204, 400, 401, 404)
    - JSON Content-Type 응답 헤더 검증
    - _요구사항: 11.1, 11.3, 12.1_

- [x] 12. 최종 체크포인트 - 전체 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의한다.

## 참고 사항

- `*` 표시된 태스크는 선택 사항이며, 빠른 MVP를 위해 건너뛸 수 있습니다
- 각 태스크는 추적 가능성을 위해 특정 요구사항을 참조합니다
- 체크포인트에서 점진적 검증을 수행합니다
- 속성 테스트는 설계 문서의 정확성 속성을 검증합니다
- 단위 테스트는 구체적인 예시와 엣지 케이스를 검증합니다
