const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models');

const router = express.Router();

// Регулярки
const PASSWORD_REGEX = /^\S{6,}$/;           // ≥ 6 символов, без пробелов
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@gmail\.com$/;

// ==================== API ====================

router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });
    if (!EMAIL_REGEX.test(email)) return res.status(400).json({ error: 'Email должен быть в формате ...@gmail.com' });
    if (!PASSWORD_REGEX.test(password)) return res.status(400).json({ error: 'Пароль: ≥ 6 символов, без пробелов' });

    const existing = await db.User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Такой email уже существует' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.User.create({ email, passwordHash, role: 'user' });
    res.status(201).json({ id: user.id, email: user.email, role: user.role });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });

    const user = await db.User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ error: 'Неверный email или пароль' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) { next(err); }
});

// ==================== Формы ====================

router.get('/login', (req, res) => {
  res.render('login', { user: req.user, error: null });
});

router.post('/login-form', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).render('login', { user: req.user, error: 'Email и пароль обязательны' });
    }

    const user = await db.User.findOne({ where: { email } });
    if (!user) return res.status(401).render('login', { user: req.user, error: 'Неверный email или пароль' });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).render('login', { user: req.user, error: 'Неверный email или пароль' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.cookie('token', token, { httpOnly: true, maxAge: 3600000, sameSite: 'lax' });
    res.redirect('/');
  } catch (err) { next(err); }
});

router.get('/register', (req, res) => {
  res.render('register', { user: req.user, error: null });
});

router.post('/register-form', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Email
    if (!email || !email.trim()) {
      return res.status(400).render('register', { user: req.user, error: 'Email обязателен' });
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).render('register', { user: req.user, error: 'Email должен быть в формате ...@gmail.com' });
    }

    // Пароль
    if (!password) {
      return res.status(400).render('register', { user: req.user, error: 'Пароль обязателен' });
    }
    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).render('register', { user: req.user, error: 'Пароль: не менее 6 символов, без пробелов' });
    }

    const existing = await db.User.findOne({ where: { email: email.trim() } });
    if (existing) {
      return res.status(409).render('register', { user: req.user, error: 'Такой email уже существует' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.User.create({ email: email.trim(), passwordHash, role: 'user' });
    res.redirect('/auth/login');
  } catch (err) { next(err); }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

module.exports = router;