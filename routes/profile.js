const express = require('express');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Все маршруты профиля — только для авторизованных
router.use(requireAuth);

// GET /profile — полный профиль текущего пользователя
router.get('/', async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json(user);
});

// PUT /profile — обновить вложенный документ profile (и car, если водитель)
router.put('/', async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const { profile, car } = req.body || {};

  if (profile) {
    // Обновляем поля вложенного документа по отдельности
    ['name', 'phone', 'city', 'bio'].forEach((key) => {
      if (profile[key] !== undefined) user.profile[key] = profile[key];
    });
  }
  if (car && (user.role === 'driver' || user.role === 'admin')) {
    user.car = { ...(user.car?.toObject?.() || {}), ...car };
  }

  await user.save(); // валидация вложенных схем (телефон, год авто и т.д.)
  res.json(user);
});

// PUT /profile/password — смена пароля
router.put('/password', async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Укажите старый и новый пароль' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Новый пароль должен быть не короче 6 символов' });
  }

  const user = await User.findById(req.user.id);
  if (!(await user.comparePassword(oldPassword))) {
    return res.status(400).json({ error: 'Старый пароль указан неверно' });
  }

  await user.setPassword(newPassword);
  await user.save();
  res.json({ message: 'Пароль изменён' });
});

// POST /profile/become-driver — стать водителем (нужно указать автомобиль)
router.post('/become-driver', async (req, res) => {
  const { car, phone } = req.body || {};
  if (!car?.brand || !car?.model) {
    return res.status(400).json({ error: 'Укажите хотя бы марку и модель автомобиля' });
  }

  const user = await User.findById(req.user.id);
  if (user.role === 'admin') return res.status(400).json({ error: 'Администратор не может стать водителем' });

  user.car = car;
  if (phone) user.profile.phone = phone;
  user.role = 'driver';
  await user.save();

  res.json({ message: 'Теперь вы водитель! Можете публиковать поездки.', user });
});

module.exports = router;
