const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const COOKIE_OPTIONS = { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 };

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  name: user.displayName,
});

// POST /auth/register — регистрация
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' });
  }

  const existing = await User.findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
  }

  const user = new User({ email, role: 'user', profile: { name: name || '' } });
  await user.setPassword(password);
  await user.save(); // тут же сработает валидация схемы (формат email и т.д.)

  res.status(201).json(publicUser(user));
});

// POST /auth/login — вход
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  const user = await User.findByEmail(email);
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  if (user.isBlocked) {
    return res.status(403).json({ error: 'Аккаунт заблокирован администратором' });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

  // Токен в HttpOnly cookie — JS на странице его не видит (защита от XSS)
  res.cookie('token', token, COOKIE_OPTIONS);
  res.json({ token, user: publicUser(user) });
});

// POST /auth/logout — выход (чистим cookie)
router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  res.json({ message: 'Вы вышли из системы' });
});

// GET /auth/me — кто я
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
  res.json(req.user);
});

module.exports = router;
