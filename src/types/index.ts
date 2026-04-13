// 데이터베이스 설정 타입
export interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}

// 소설 관련 타입
export interface Novel {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface NovelSummary {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface NovelDetail extends Novel {
  chapters: ChapterSummary[];
}

export interface CreateNovelInput {
  title: string;
  description?: string;
}

export interface UpdateNovelInput {
  title?: string;
  description?: string;
}

// 챕터 관련 타입
export interface Chapter {
  id: number;
  novelId: number;
  title: string;
  content: string;
  orderNum: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterSummary {
  id: number;
  title: string;
  orderNum: number;
}

export interface CreateChapterInput {
  title: string;
  content?: string;
}

export interface UpdateChapterInput {
  title?: string;
  content?: string;
}

export interface ReorderChaptersInput {
  chapterIds: number[];
}
