// src/modules/auth/tokenService.ts
import jwt, { SignOptions, Secret } from "jsonwebtoken";
import type { Response } from "express";
import config from "../../shared/config";

export interface JwtLike {
  sub: string;
  roles?: string[];
}

export function issueAccess(payload: JwtLike): string {
  const opts: SignOptions = {
    algorithm: "HS256",
    expiresIn: config.jwt.accessExpires, // number (seconds)
  };
  return jwt.sign(payload as object, config.jwt.accessSecret as Secret, opts);
}

export function issueRefresh(payload: JwtLike): string {
  const opts: SignOptions = {
    algorithm: "HS256",
    expiresIn: config.jwt.refreshExpires, // number (seconds)
  };
  const p = { ...payload, typ: "refresh" as const };
  return jwt.sign(p as object, config.jwt.refreshSecret as Secret, opts);
}

export function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.cookies.secure,
    domain: config.cookies.domain,
    path: "/",
    maxAge: config.jwt.refreshExpires * 1000, // milliseconds
  };
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie("refreshToken", token, cookieOpts());
}
