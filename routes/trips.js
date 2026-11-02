const express = require('express');
const db = require('../models');
const authenticate = require('../middleware/auth');
const { isAdmin } = require('../middleware/auth');

const router = express.Router();

// 1. GET /trips — получить все поездки (доступно всем)
router.get('/', async (req, res, next) => {
  try {
    const trips = await db.Trip.findAll({
      include: [
        { model: db.Driver, as: 'driver' },
        { 
          model: db.Booking, 
          as: 'bookings', 
          include: [{ model: db.User, as: 'user', attributes: ['email'] }] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(trips);
  } catch (err) { next(err); }
});

// 2. POST /trips — добавить поездку (только админ)
router.post('/', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { from, to, departureAt, price, seats, rating, driverId } = req.body;
    
    if (!from || !to || !departureAt || price === undefined || seats === undefined) {
      return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
    }

    const newTrip = await db.Trip.create({
      from, to, departureAt, price, seats,
      rating: rating || 0,
      driverId: driverId || null
    });
    
    res.status(201).json(newTrip);
  } catch (err) { next(err); }
});

// 3. PUT /trips/:id — обновить поездку (только админ)
router.put('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const trip = await db.Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Поездка не найдена' });

    const { from, to, departureAt, price, seats, rating, driverId } = req.body;
    await trip.update({
      from, to, departureAt, price, seats,
      rating: rating || 0,
      driverId: driverId || null
    });
    
    res.json(trip);
  } catch (err) { next(err); }
});

// 4. DELETE /trips/:id — удалить поездку (только админ)
router.delete('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const trip = await db.Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Поездка не найдена' });
    
    await trip.destroy();
    res.status(204).send();
  } catch (err) { next(err); }
});

// 5. POST /trips/:id/book — купить билет (только юзер)
router.post('/:id/book', authenticate, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Нужно войти' });
    if (req.user.role !== 'user') return res.status(403).json({ error: 'Только пассажиры могут покупать' });

    const trip = await db.Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Поездка не найдена' });
    if (trip.seats <= 0) return res.status(400).json({ error: 'Нет свободных мест' });

    // Проверяем, не купил ли уже
    const existing = await db.Booking.findOne({ where: { userId: req.user.id, tripId: trip.id } });
    if (existing) return res.status(400).json({ error: 'Вы уже купили билет на этот рейс' });

    // Создаем бронь и уменьшаем места
    await db.Booking.create({ userId: req.user.id, tripId: trip.id, seats: 1 });
    await trip.update({ seats: trip.seats - 1 });

    res.json({ message: 'Билет успешно куплен', trip });
  } catch (err) { next(err); }
});

// 6. GET /trips/my-bookings — мои билеты
router.get('/my-bookings', authenticate, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Нужно войти' });
    
    const bookings = await db.Booking.findAll({
      where: { userId: req.user.id },
      include: [{ model: db.Trip, as: 'trip' }]
    });
    
    res.json(bookings);
  } catch (err) { next(err); }
});
// 7. DELETE /trips/my-bookings/:bookingId — отменить бронь
router.delete('/my-bookings/:bookingId', authenticate, async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Нужно войти' });

    // Ищем билет этого пользователя
    const booking = await db.Booking.findOne({
      where: { id: req.params.bookingId, userId: req.user.id }
    });

    if (!booking) return res.status(404).json({ error: 'Билет не найден' });

    // Возвращаем места обратно к поездке
    const trip = await db.Trip.findByPk(booking.tripId);
    if (trip) {
      await trip.update({ seats: trip.seats + booking.seats });
    }

    // Удаляем билет
    await booking.destroy();
    res.json({ message: 'Билет успешно отменен' });
  } catch (err) { next(err); }
});
module.exports = router;