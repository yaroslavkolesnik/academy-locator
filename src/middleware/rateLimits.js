import { rateLimit } from 'express-rate-limit';
import { AppError, ErrorCode } from '../errors.js';

export function createRateLimit({ windowMs, max }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res, next) => next(new AppError(ErrorCode.RATE_LIMITED, 'Забагато запитів, спробуйте пізніше')),
  });
}
