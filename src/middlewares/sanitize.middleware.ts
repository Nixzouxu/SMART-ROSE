import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanitizeObj = (obj: any): any => {
  if (typeof obj === 'string') {
    return xss(obj);
  }
  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      return obj.map((item) => sanitizeObj(item));
    }
    const sanitizedObj: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      sanitizedObj[key] = sanitizeObj(obj[key]);
    }
    return sanitizedObj;
  }
  return obj;
};

export const sanitizeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizeObj(req.body);
  if (req.query) {
    const sanitized = sanitizeObj(req.query);
    for (const key of Object.keys(req.query)) {
      req.query[key] = sanitized[key];
    }
  }
  if (req.params) {
    const sanitized = sanitizeObj(req.params);
    for (const key of Object.keys(req.params)) {
      req.params[key] = sanitized[key];
    }
  }
  next();
};
