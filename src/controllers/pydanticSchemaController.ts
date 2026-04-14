import { Request, Response } from 'express';

const PYDANTIC_MODELS = `from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl


# ──────────────────────────────────────────────
# Novel
# ──────────────────────────────────────────────

class CreateNovelRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)


class UpdateNovelRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)


class ChapterSummary(BaseModel):
    id: int
    title: str
    order_num: int = Field(..., alias="orderNum")


class Novel(BaseModel):
    id: int
    title: str
    description: str
    created_at: str = Field(..., alias="createdAt")
    updated_at: str = Field(..., alias="updatedAt")


class NovelDetail(Novel):
    chapters: list[ChapterSummary] = []


# ──────────────────────────────────────────────
# Chapter
# ──────────────────────────────────────────────

class CreateChapterRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: Optional[str] = None


class UpdateChapterRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = None


class ReorderChaptersRequest(BaseModel):
    chapter_ids: list[int] = Field(..., alias="chapterIds")


class Chapter(BaseModel):
    id: int
    novel_id: int = Field(..., alias="novelId")
    title: str
    content: str
    order_num: int = Field(..., alias="orderNum")
    created_at: str = Field(..., alias="createdAt")
    updated_at: str = Field(..., alias="updatedAt")


# ──────────────────────────────────────────────
# Illustration
# ──────────────────────────────────────────────

class CreateIllustrationRequest(BaseModel):
    image_url: HttpUrl = Field(..., alias="imageUrl", max_length=2000)
    caption: Optional[str] = Field(None, max_length=500)


class UpdateIllustrationRequest(BaseModel):
    image_url: Optional[HttpUrl] = Field(None, alias="imageUrl", max_length=2000)
    caption: Optional[str] = Field(None, max_length=500)


class Illustration(BaseModel):
    id: int
    chapter_id: int = Field(..., alias="chapterId")
    image_url: str = Field(..., alias="imageUrl")
    caption: str
    order_num: int = Field(..., alias="orderNum")
    created_at: str = Field(..., alias="createdAt")
`;


interface EndpointSchema {
  method: string;
  path: string;
  description: string;
  requestModel: string | null;
  responseModel: string;
}

const ENDPOINTS: EndpointSchema[] = [
  // Novel endpoints
  {
    method: 'POST',
    path: '/novels',
    description: '소설 생성',
    requestModel: 'CreateNovelRequest',
    responseModel: 'Novel',
  },
  {
    method: 'GET',
    path: '/novels',
    description: '소설 목록 조회',
    requestModel: null,
    responseModel: 'list[Novel]',
  },
  {
    method: 'GET',
    path: '/novels/:id',
    description: '소설 상세 조회 (챕터 포함)',
    requestModel: null,
    responseModel: 'NovelDetail',
  },
  {
    method: 'PUT',
    path: '/novels/:id',
    description: '소설 수정',
    requestModel: 'UpdateNovelRequest',
    responseModel: 'Novel',
  },
  {
    method: 'DELETE',
    path: '/novels/:id',
    description: '소설 삭제',
    requestModel: null,
    responseModel: '204 No Content',
  },
  // Chapter endpoints
  {
    method: 'POST',
    path: '/novels/:novelId/chapters',
    description: '챕터 생성',
    requestModel: 'CreateChapterRequest',
    responseModel: 'Chapter',
  },
  {
    method: 'GET',
    path: '/novels/:novelId/chapters/:id',
    description: '챕터 상세 조회',
    requestModel: null,
    responseModel: 'Chapter',
  },
  {
    method: 'PUT',
    path: '/novels/:novelId/chapters/:id',
    description: '챕터 수정',
    requestModel: 'UpdateChapterRequest',
    responseModel: 'Chapter',
  },
  {
    method: 'DELETE',
    path: '/novels/:novelId/chapters/:id',
    description: '챕터 삭제',
    requestModel: null,
    responseModel: '204 No Content',
  },
  {
    method: 'PUT',
    path: '/novels/:novelId/chapters/reorder',
    description: '챕터 순서 변경',
    requestModel: 'ReorderChaptersRequest',
    responseModel: 'list[Chapter]',
  },
  // Illustration endpoints
  {
    method: 'POST',
    path: '/novels/:novelId/chapters/:chapterId/illustrations',
    description: '삽화 생성',
    requestModel: 'CreateIllustrationRequest',
    responseModel: 'Illustration',
  },
  {
    method: 'GET',
    path: '/novels/:novelId/chapters/:chapterId/illustrations',
    description: '삽화 목록 조회',
    requestModel: null,
    responseModel: 'list[Illustration]',
  },
  {
    method: 'GET',
    path: '/novels/:novelId/chapters/:chapterId/illustrations/:id',
    description: '삽화 상세 조회',
    requestModel: null,
    responseModel: 'Illustration',
  },
  {
    method: 'PUT',
    path: '/novels/:novelId/chapters/:chapterId/illustrations/:id',
    description: '삽화 수정',
    requestModel: 'UpdateIllustrationRequest',
    responseModel: 'Illustration',
  },
  {
    method: 'DELETE',
    path: '/novels/:novelId/chapters/:chapterId/illustrations/:id',
    description: '삽화 삭제',
    requestModel: null,
    responseModel: '204 No Content',
  },
];

export class PydanticSchemaController {
  getSchemas = (_req: Request, res: Response): void => {
    res.status(200).json({
      pydanticModels: PYDANTIC_MODELS,
      endpoints: ENDPOINTS,
    });
  };
}
