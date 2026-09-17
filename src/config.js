const toInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const toList = (value) =>
  String(value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// Уся конфігурація з env в одному місці. Приймає env параметром — зручно для тестів.
export function loadConfig(env = process.env) {
  return {
    nodeEnv: env.NODE_ENV || 'development',
    port: toInt(env.PORT, 3000),
    mongoUri: env.MONGODB_URI || '',
    mongoDb: env.MONGODB_DB || 'academy_locator',
    adminToken: env.ADMIN_TOKEN || '',
    corsOrigins: toList(env.CORS_ORIGIN),
    rateLimit: {
      windowMs: toInt(env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
      max: toInt(env.RATE_LIMIT_MAX, 300),
    },
    // Окремий, суворіший ліміт для POST (реєстрації, заявки, квіз)
    writeRateLimit: {
      windowMs: toInt(env.WRITE_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
      max: toInt(env.WRITE_RATE_LIMIT_MAX, 30),
    },
  };
}
