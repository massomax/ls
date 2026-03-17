import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../errors/httpErrors";
import logger from "../logger";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "NotFound" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof HttpError) {
    if (err.status >= 500) {
      logger.error({ err }, "HttpError 5xx");
    }
    return res.status(err.status).json({
      error: err.code,
      message: err.message,
      details: err.details,
    });
  }
  logger.error({ err }, "Unhandled error");
  return res.status(500).json({ error: "InternalServerError" });
}
