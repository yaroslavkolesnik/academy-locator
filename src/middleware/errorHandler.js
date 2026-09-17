import { AppError, ErrorCode } from '../errors.js';

export const STATUS_BY_CODE = Object.freeze({
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.NO_SEATS]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL]: 500,
});

export function notFoundHandler(req, res, next) {
  next(new AppError(ErrorCode.NOT_FOUND, 'Маршрут не знайдено'));
}

// Єдиний формат: { error: { code, message, details? } }
export function createErrorHandler({ logger = console } = {}) {
  // eslint-disable-next-line no-unused-vars
  return function errorHandler(err, req, res, next) {
    let error = err;

    if (!(err instanceof AppError)) {
      if (err?.type === 'entity.parse.failed') {
        error = new AppError(ErrorCode.VALIDATION_ERROR, 'Некоректний JSON у тілі запиту');
      } else if (err?.type === 'entity.too.large') {
        error = new AppError(ErrorCode.VALIDATION_ERROR, 'Завеликий запит');
      } else {
        logger.error('[error]', req.method, req.originalUrl, err);
        error = new AppError(ErrorCode.INTERNAL, 'Внутрішня помилка сервера');
      }
    }

    const status = STATUS_BY_CODE[error.code] ?? 500;
    const body = { code: error.code, message: error.message };
    if (error.details !== undefined) body.details = error.details;
    res.status(status).json({ error: body });
  };
}
