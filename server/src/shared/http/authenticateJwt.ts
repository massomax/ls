import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config";
import { UnauthorizedError } from "../errors/httpErrors";

export interface JwtPayload {
  sub: string; // user id
  roles?: string[]; // ['user','seller','admin']
  iat?: number;
  exp?: number;
}

export default function authenticateJwt(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const h = req.headers.authorization;
  if (!h || !h.toLowerCase().startsWith("bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }
  const token = h.slice(7).trim();
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
    (req as any).user = payload;
    next();
  } catch {
    throw new UnauthorizedError("InvalidToken");
  }
}
