export class AppError extends Error {
  public statusCode: number;
  public details?: Array<{ field: string; message: string }>;

  constructor(
    statusCode: number,
    message: string,
    details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource}을(를) 찾을 수 없습니다`);
  }
}

export class ValidationError extends AppError {
  constructor(details: Array<{ field: string; message: string }>) {
    super(400, "요청 데이터가 유효하지 않습니다", details);
  }
}
