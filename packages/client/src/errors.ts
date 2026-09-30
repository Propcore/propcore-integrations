export class PropcoreError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'PropcoreError';
    this.status = status;
    this.code = code;
  }
}

export class PropcoreAuthError extends PropcoreError {
  constructor(message: string, code?: string) {
    super(message, 401, code);
    this.name = 'PropcoreAuthError';
  }
}

export class PropcoreNotFoundError extends PropcoreError {
  constructor(message: string, code?: string) {
    super(message, 404, code);
    this.name = 'PropcoreNotFoundError';
  }
}

export class PropcoreRateLimitError extends PropcoreError {
  readonly retryAfter: number | undefined;
  constructor(message: string, retryAfter?: number, code?: string) {
    super(message, 429, code);
    this.name = 'PropcoreRateLimitError';
    this.retryAfter = retryAfter;
  }
}
