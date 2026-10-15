const db = require('../models');

module.exports = (req, res, next) => {
  const start = Date.now();

  res.on('finish', async () => {
    try {
      // Не логируем статику (css, js, картинки)
      if (req.url.startsWith('/static') || req.url.startsWith('/favicon')) return;

      await db.RequestLog.create({
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent') || 'unknown'
      });

      const duration = Date.now() - start;
      console.log(`[LOG] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
    } catch (err) {
      console.error('Ошибка логирования:', err.message);
    }
  });

  next();
};