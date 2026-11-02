const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models');

const router = express.Router();

// POST /auth/register — регистрация
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

 
    const existing = await db.User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }


    const passwordHash = await bcrypt.hash(password, 10);


    const user = await db.User.create({
      email,
      passwordHash,
      role: 'user'
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    next(err);
  }
});
// POST /auth/login — вход
// POST /auth/login — вход через API
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const user = await db.User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ error: 'Неверный email или пароль' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 🔥 ГЛАВНОЕ: Сохраняем токен в HttpOnly Cookie!
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000,
      sameSite: 'lax'
    });

    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) { next(err); }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('http://localhost:5173');
});

router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' });
  res.json(req.user);
});
module.exports = router;
