const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 1. authenticate — подключается глобально в server.js.
//    Если есть валидный токен (в заголовке или cookie), кладёт пользователя в req.user,
//    иначе req.user = null. Сам по себе ничего не запрещает.
const authenticate = async (req, res, next) => {
  let token = null;

  // Токен из заголовка Authorization: Bearer <token> (для Postman)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1];
  }

  // Токен из HttpOnly cookie (для React)
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  req.user = null;
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('email role isBlocked profile');
    if (user && !user.isBlocked) {
      req.user = { id: user.id, email: user.email, role: user.role, name: user.displayName };
    }
  } catch {
    // невалидный или просроченный токен — просто считаем пользователя гостем
  }
  next();
};

// 2. requireAuth — пускает только авторизованных
const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Нужно войти в систему' });
  next();
};

// 3. requireRole('admin', 'driver') — пускает только указанные роли
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Нужно войти в систему' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Доступ запрещён' });
  next();
};

const isAdmin = requireRole('admin');

module.exports = authenticate;
module.exports.requireAuth = requireAuth;
module.exports.requireRole = requireRole;
module.exports.isAdmin = isAdmin;
