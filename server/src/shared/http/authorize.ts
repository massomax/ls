import type { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../errors/httpErrors";

export default function authorize(...allowed: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user as { roles?: string[] } | undefined;
    const roles = user?.roles || [];
    const ok =
      roles.some((r) => allowed.includes(r)) || roles.includes("admin");
    if (!ok) throw new ForbiddenError();
    next();
  };
}
