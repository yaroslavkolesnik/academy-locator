import { createHash, timingSafeEqual } from 'node:crypto';
import { AppError, ErrorCode } from '../errors.js';

const digest = (value) => createHash('sha256').update(String(value)).digest();

// Перевірка заголовка X-Admin-Token. Порівняння хешів однакової довжини — без витоку через час.
export function createAdminAuth(adminToken) {
  const expected = digest(adminToken);
  return function adminAuth(req, res, next) {
    const provided = req.get('X-Admin-Token');
    if (!provided || !timingSafeEqual(digest(provided), expected)) {
      return next(new AppError(ErrorCode.UNAUTHORIZED, 'Потрібен коректний X-Admin-Token'));
    }
    res.set('Cache-Control', 'no-store');
    next();
  };
}
