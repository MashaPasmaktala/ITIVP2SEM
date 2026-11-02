const jwt = require('jsonwebtoken');
const db = require('../models');

// 1. Функция проверки токена
const authenticate = async (req, res, next) => {
  let token = null;
  
  // Ищем токен в заголовке (для Postman/Thunder)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1];
  }
  
  // Ищем токен в Cookie (для React)
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.User.findByPk(decoded.id, { attributes: ['id', 'email', 'role'] });
    req.user = user ? user.toJSON() : null;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

// 2. Функция проверки роли Админа
const isAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещён' });
  next();
};

// 3. Правильный экспорт (сначала главная функция, потом isAdmin)
module.exports = authenticate;
module.exports.isAdmin = isAdmin;