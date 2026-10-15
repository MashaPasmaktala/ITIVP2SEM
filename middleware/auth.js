const jwt = require('jsonwebtoken');
const db = require('../models');

// Основной middleware — читает токен из заголовка Authorization или cookie
module.exports = async (req, res, next) => {
  let token = null;

  // 1. Заголовок Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  // 2. Cookie token
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // 3. Токена нет — гость (не блокируем, публичные страницы работают)
  if (!token) {
    req.user = null;
    res.locals.user = null;
    return next();
  }

  // 4. Верифицируем
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.User.findByPk(decoded.id, {
      attributes: ['id', 'email', 'role']
    });

    req.user = user ? user.toJSON() : null;
    res.locals.user = req.user;
    next();
  } catch (err) {
    req.user = null;
    res.locals.user = null;
    next();
  }
};

// Только для страниц, требующих входа
module.exports.requireAuth = (req, res, next) => {
  if (!req.user) return res.redirect('/auth/login');
  next();
};

// Только для админа (EJS)
module.exports.requireAdmin = (req, res, next) => {
  if (!req.user) return res.redirect('/auth/login');
  if (req.user.role !== 'admin') return res.status(403).render('403', { user: req.user });
  next();
};

// Для JSON API — возвращает 401/403 вместо редиректа
module.exports.isAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещён' });
  next();
};