import 'express';

declare global {
  namespace Express {
    interface UserPayload {
      sub: string;
      roles?: string[];
    }
    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
