// Express 4 не ловить відхилені проміси — передаємо помилку в errorHandler явно
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
