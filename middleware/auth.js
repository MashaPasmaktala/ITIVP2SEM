const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // 1. Берём заголовок Authorization
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  // 2. Проверяем формат: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Неверный формат токена' });
  }

  const token = parts[1];

  // 3. Верифицируем токен
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;   // { id, email, role, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
};
module.exports.isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещён. Требуется роль admin' });
  }
  next();
};