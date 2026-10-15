const express = require('express');
const db = require('../models');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Регулярки
const TEXT_REGEX = /^[А-Яа-яЁёA-Za-z\s\-]+$/;   // только буквы, пробелы, дефис

// Валидация полей поездки — общая функция
function validateTrip(body, errors) {
  const { from, to, departureAt, price, seats, rating } = body;

  // Откуда
  if (!from || !from.trim()) errors.push('Поле "Откуда" обязательно');
  else if (!TEXT_REGEX.test(from.trim())) errors.push('Поле "Откуда" должно содержать только буквы');

  // Куда
  if (!to || !to.trim()) errors.push('Поле "Куда" обязательно');
  else if (!TEXT_REGEX.test(to.trim())) errors.push('Поле "Куда" должно содержать только буквы');

  // Дата в будущем
  if (!departureAt || !departureAt.trim()) {
    errors.push('Поле "Дата отправления" обязательно');
  } else {
    const depDate = new Date(departureAt);
    if (isNaN(depDate.getTime())) {
      errors.push('Некорректная дата отправления');
    } else if (depDate <= new Date()) {
      errors.push('Дата отправления должна быть в будущем');
    }
  }

  // Числа ≥ 0
  const priceNum = Number(price);
  const seatsNum = Number(seats);
  const ratingNum = rating ? Number(rating) : 0;

  if (isNaN(priceNum) || priceNum < 0) errors.push('Цена должна быть числом ≥ 0');
  if (isNaN(seatsNum) || seatsNum < 0) errors.push('Количество мест должно быть числом ≥ 0');
  if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 5) errors.push('Рейтинг должен быть от 0 до 5');
}

// ==================== Список ====================

router.get('/', async (req, res, next) => {
  try {
    const trips = await db.Trip.findAll({
      include: [{ model: db.Driver, as: 'driver' }],
      order: [['createdAt', 'DESC']]
    });
    res.render('index', { trips, user: req.user });
  } catch (err) { next(err); }
});

router.get('/item/:id', async (req, res, next) => {
  try {
    const trip = await db.Trip.findByPk(req.params.id, {
      include: [{ model: db.Driver, as: 'driver' }]
    });
    if (!trip) return res.status(404).render('404', { user: req.user });

    // Проверяем, покупал ли текущий user эту поездку
    let alreadyBought = false;
    if (req.user && req.user.role === 'user') {
      const existing = await db.Booking.findOne({
        where: { userId: req.user.id, tripId: trip.id }
      });
      alreadyBought = !!existing;
    }

    res.render('item', { trip, user: req.user, alreadyBought });
  } catch (err) { next(err); }
});

// ==================== Покупка (POST) ====================

router.post('/item/:id/buy', async (req, res, next) => {
  try {
    const trip = await db.Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).render('404', { user: req.user });

    if (!req.user) return res.redirect('/auth/login');
    if (req.user.role !== 'user') return res.status(403).render('403', { user: req.user });

    // Уже куплено?
    const existing = await db.Booking.findOne({
      where: { userId: req.user.id, tripId: trip.id }
    });
    if (existing) {
      return res.status(400).render('buy-error', {
        user: req.user, trip,
        errorMessage: 'Вы уже купили билет на эту поездку'
      });
    }

    // Есть ли места?
    if (trip.seats <= 0) {
      return res.status(400).render('buy-error', {
        user: req.user, trip,
        errorMessage: 'На эту поездку больше нет свободных мест'
      });
    }

    // Создаём бронь + уменьшаем места
    await db.Booking.create({ userId: req.user.id, tripId: trip.id, seats: 1 });
    await trip.update({ seats: trip.seats - 1 });

    res.render('buy-success', { trip, user: req.user });
  } catch (err) { next(err); }
});

// ==================== CRUD админа ====================

router.get('/add', requireAdmin, async (req, res, next) => {
  try {
    const drivers = await db.Driver.findAll({ order: [['name', 'ASC']] });
    res.render('add', { user: req.user, drivers, errors: [], formData: null });
  } catch (err) { next(err); }
});

router.post('/add', requireAdmin, async (req, res, next) => {
  try {
    const errors = [];
    validateTrip(req.body, errors);

    if (errors.length > 0) {
      const drivers = await db.Driver.findAll({ order: [['name', 'ASC']] });
      return res.status(400).render('add', {
        user: req.user, drivers, errors,
        formData: req.body
      });
    }

    await db.Trip.create({
      from: req.body.from.trim(),
      to: req.body.to.trim(),
      departureAt: new Date(req.body.departureAt),
      price: Number(req.body.price),
      seats: Number(req.body.seats),
      rating: req.body.rating ? Number(req.body.rating) : 0,
      driverId: req.body.driverId || null
    });

    res.redirect('/');
  } catch (err) { next(err); }
});

router.get('/item/:id/edit', requireAdmin, async (req, res, next) => {
  try {
    const trip = await db.Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).render('404', { user: req.user });
    const drivers = await db.Driver.findAll({ order: [['name', 'ASC']] });
    res.render('edit', { trip, drivers, user: req.user, errors: [] });
  } catch (err) { next(err); }
});

router.post('/item/:id/edit', requireAdmin, async (req, res, next) => {
  try {
    const trip = await db.Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).render('404', { user: req.user });

    const errors = [];
    validateTrip(req.body, errors);

    if (errors.length > 0) {
      const drivers = await db.Driver.findAll({ order: [['name', 'ASC']] });
      return res.status(400).render('edit', { trip, drivers, user: req.user, errors });
    }

    await trip.update({
      from: req.body.from.trim(),
      to: req.body.to.trim(),
      departureAt: new Date(req.body.departureAt),
      price: Number(req.body.price),
      seats: Number(req.body.seats),
      rating: req.body.rating ? Number(req.body.rating) : 0,
      driverId: req.body.driverId || null
    });

    res.redirect('/item/' + trip.id);
  } catch (err) { next(err); }
});

router.post('/item/:id/delete', requireAdmin, async (req, res, next) => {
  try {
    const trip = await db.Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).render('404', { user: req.user });
    await trip.destroy();
    res.redirect('/');
  } catch (err) { next(err); }
});

router.get('/boom', (req, res, next) => {
  next(new Error('Тестовая ошибка 500'));
});

module.exports = router;