export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(
    status: number,
    code: string,
    message?: string,
    details?: unknown
  ) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
export class BadRequestError extends HttpError {
  constructor(message = "BadRequest", details?: unknown) {
    super(400, "BadRequest", message, details);
  }
}
export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized", details?: unknown) {
    super(401, "Unauthorized", message, details);
  }
}
export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden", details?: unknown) {
    super(403, "Forbidden", message, details);
  }
}
export class NotFoundError extends HttpError {
  constructor(message = "NotFound", details?: unknown) {
    super(404, "NotFound", message, details);
  }
}
export class ConflictError extends HttpError {
  constructor(message = "Conflict", details?: unknown) {
    super(409, "Conflict", message, details);
  }
}
export class TooManyRequestsError extends HttpError {
  constructor(message = "TooManyRequests", details?: unknown) {
    super(429, "TooManyRequests", message, details);
  }
}
