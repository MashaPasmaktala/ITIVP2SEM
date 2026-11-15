const express = require('express');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const { requireAuth, requireRole } = require('../middleware/auth');
const { httpError, isValidId, pick } = require('../utils/http');

const router = express.Router();

// Какие поля водителя отдаём наружу при populate
const DRIVER_FIELDS = 'email profile car role';

// Экранируем спецсимволы, чтобы строку поиска можно было подставить в RegExp
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Загрузить поездку или вернуть 404
async function findTripOr404(id) {
  if (!isValidId(id)) throw httpError(400, 'Некорректный id поездки');
  const trip = await Trip.findById(id);
  if (!trip) throw httpError(404, 'Поездка не найдена');
  return trip;
}

// Может ли пользователь управлять поездкой (админ или водитель этой поездки)
const canManage = (user, trip) =>
  !!user && (user.role === 'admin' || (trip.driver && String(trip.driver._id || trip.driver) === user.id));

// Привести stops из тела запроса к нужному виду
const normalizeStops = (stops) =>
  Array.isArray(stops)
    ? stops
        .filter((s) => s && (typeof s === 'string' ? s.trim() : s.city))
        .map((s) => (typeof s === 'string' ? { city: s.trim() } : { city: s.city, time: s.time || undefined }))
    : undefined;

// Привести tags к массиву строк в нижнем регистре
const normalizeTags = (tags) => {
  if (tags === undefined) return undefined;
  const arr = Array.isArray(tags) ? tags : String(tags).split(',');
  return [...new Set(arr.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
};

/* =====================================================================
 * 1. GET /trips — список с поиском, фильтрами, сортировкой и пагинацией
 *    ?from=Минск&to=Брест&date=2026-11-20&minPrice=10&maxPrice=50
 *    &seats=2&tag=комфорт&sort=price|-price|departureAt|rating&page=1&limit=10
 *    &all=true (показать и прошедшие/отменённые — для админа)
 * ===================================================================== */
router.get('/', async (req, res) => {
  const { from, to, date, minPrice, maxPrice, seats, tag, sort, all } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

  // Цепочка методов Query: .where().gte().lte() ...
  const query = Trip.find();

  // По умолчанию показываем только будущие запланированные поездки
  const onlyUpcoming = all !== 'true';
  let minDate = onlyUpcoming ? new Date() : null;
  let maxDate = null;

  if (onlyUpcoming) query.where('status').equals('scheduled');
  if (from) query.where('from').regex(new RegExp(escapeRegex(from), 'i'));
  if (to) query.where('to').regex(new RegExp(escapeRegex(to), 'i'));
  if (date) {
    const start = new Date(`${date}T00:00:00`);
    if (!Number.isNaN(start.getTime())) {
      maxDate = new Date(start);
      maxDate.setDate(maxDate.getDate() + 1);
      if (!minDate || start > minDate) minDate = start;
    }
  }
  if (minDate) query.where('departureAt').gte(minDate);
  if (maxDate) query.where('departureAt').lt(maxDate);
  if (minPrice) query.where('price').gte(Number(minPrice));
  if (maxPrice) query.where('price').lte(Number(maxPrice));
  if (seats) query.where('seats').gte(Number(seats));
  if (tag) query.where('tags').equals(String(tag).toLowerCase()); // «массив содержит значение»

  const sortMap = {
    departureAt: { departureAt: 1 },
    price: { price: 1 },
    '-price': { price: -1 },
    rating: { rating: -1 },
    new: { createdAt: -1 },
  };

  // Считаем общее количество по тем же условиям (для пагинации)
  const total = await Trip.countDocuments(query.getFilter());

  const items = await query
    .sort(sortMap[sort] || sortMap.departureAt)
    .skip((page - 1) * limit)
    .limit(limit)
    .select('-reviews.comment') // текст отзывов в списке не нужен
    .populate('driver', DRIVER_FIELDS);

  res.json({ items, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
});

/* =====================================================================
 * 2. GET /trips/my-bookings — мои брони (populate поездки и водителя)
 *    Объявлен ДО /:id, иначе Express примет "my-bookings" за id.
 * ===================================================================== */
router.get('/my-bookings', requireAuth, async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .populate({
      path: 'trip',
      populate: { path: 'driver', select: DRIVER_FIELDS },
    });

  const result = bookings.map((b) => {
    const json = b.toJSON();
    if (json.trip) {
      // Оставил ли пользователь отзыв на эту поездку
      json.reviewed = (json.trip.reviews || []).some((r) => String(r.author) === req.user.id);
      delete json.trip.reviews;
    }
    return json;
  });

  res.json(result);
});

/* 3. PATCH /trips/my-bookings/:bookingId — изменить количество мест в брони */
router.patch('/my-bookings/:bookingId', requireAuth, async (req, res) => {
  const newSeats = Number(req.body?.seats);
  if (!Number.isInteger(newSeats) || newSeats < 1 || newSeats > 4) {
    return res.status(400).json({ error: 'Количество мест должно быть от 1 до 4' });
  }
  if (!isValidId(req.params.bookingId)) throw httpError(400, 'Некорректный id брони');

  const booking = await Booking.findOne({ _id: req.params.bookingId, user: req.user.id, status: 'active' });
  if (!booking) return res.status(404).json({ error: 'Активная бронь не найдена' });

  const diff = newSeats - booking.seats;
  if (diff === 0) return res.json(booking);

  // Атомарно меняем свободные места: при увеличении проверяем, что их хватает
  const condition = { _id: booking.trip, status: 'scheduled', departureAt: { $gt: new Date() } };
  if (diff > 0) condition.seats = { $gte: diff };

  const trip = await Trip.findOneAndUpdate(condition, { $inc: { seats: -diff } }, { returnDocument: 'after' });
  if (!trip) return res.status(400).json({ error: 'Недостаточно свободных мест или поездка уже недоступна' });

  booking.seats = newSeats;
  await booking.save();
  res.json({ message: 'Бронь обновлена', booking, seatsLeft: trip.seats });
});

/* 4. DELETE /trips/my-bookings/:bookingId — отменить бронь (статус cancelled, места возвращаются) */
router.delete('/my-bookings/:bookingId', requireAuth, async (req, res) => {
  if (!isValidId(req.params.bookingId)) throw httpError(400, 'Некорректный id брони');

  const booking = await Booking.findOne({ _id: req.params.bookingId, user: req.user.id });
  if (!booking) return res.status(404).json({ error: 'Бронь не найдена' });
  if (booking.status === 'cancelled') return res.status(400).json({ error: 'Бронь уже отменена' });

  booking.status = 'cancelled';
  await booking.save();

  // Возвращаем места поездке (если она ещё не завершена)
  await Trip.updateOne({ _id: booking.trip, status: 'scheduled' }, { $inc: { seats: booking.seats } });

  res.json({ message: 'Бронь отменена', booking });
});

/* =====================================================================
 * 5. GET /trips/driver/mine — поездки текущего водителя + пассажиры
 * ===================================================================== */
router.get('/driver/mine', requireRole('driver', 'admin'), async (req, res) => {
  const trips = await Trip.find({ driver: req.user.id }).sort({ departureAt: -1 });

  const bookings = await Booking.find({ trip: { $in: trips.map((t) => t._id) }, status: 'active' }).populate(
    'user',
    'email profile'
  );

  const result = trips.map((t) => {
    const json = t.toJSON();
    json.passengers = bookings
      .filter((b) => String(b.trip) === t.id)
      .map((b) => ({ bookingId: b.id, seats: b.seats, user: b.user }));
    return json;
  });

  res.json(result);
});

/* =====================================================================
 * 6. GET /trips/:id — одна поездка (Model.findById + populate)
 * ===================================================================== */
router.get('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) throw httpError(400, 'Некорректный id поездки');

  const trip = await Trip.findById(req.params.id).populate('driver', DRIVER_FIELDS);
  if (!trip) return res.status(404).json({ error: 'Поездка не найдена' });

  const json = trip.toJSON();

  // Рейтинг водителя по всем его поездкам (aggregation pipeline)
  if (trip.driver) json.driverRating = await Trip.driverRating(trip.driver._id);

  // Бронь текущего пользователя на эту поездку
  if (req.user) {
    json.myBooking = await Booking.findOne({ trip: trip._id, user: req.user.id, status: 'active' });
  }

  // Пассажиров видят только водитель этой поездки и админ
  if (canManage(req.user, trip)) {
    const bookings = await Booking.find({ trip: trip._id, status: 'active' }).populate('user', 'email profile');
    json.passengers = bookings.map((b) => ({ bookingId: b.id, seats: b.seats, user: b.user }));
  }

  res.json(json);
});

/* =====================================================================
 * 7. POST /trips — создать поездку (водитель или админ)
 * ===================================================================== */
router.post('/', requireRole('driver', 'admin'), async (req, res) => {
  const body = req.body || {};
  const seatsTotal = Number(body.seatsTotal ?? body.seats);

  if (!body.from || !body.to || !body.departureAt || body.price === undefined || !seatsTotal) {
    return res.status(400).json({ error: 'Заполните откуда, куда, дату, цену и количество мест' });
  }
  if (new Date(body.departureAt) <= new Date()) {
    return res.status(400).json({ error: 'Дата отправления должна быть в будущем' });
  }

  // Водитель создаёт поездку только от своего имени, админ может указать водителя
  let driver = req.user.id;
  if (req.user.role === 'admin') {
    driver = body.driverId && isValidId(body.driverId) ? body.driverId : null;
  }

  const trip = await Trip.create({
    ...pick(body, ['from', 'to', 'departureAt', 'price', 'options', 'description']),
    seatsTotal,
    seats: seatsTotal,
    driver,
    stops: normalizeStops(body.stops) || [],
    tags: normalizeTags(body.tags) || [],
  });

  await trip.populate('driver', DRIVER_FIELDS);
  res.status(201).json(trip);
});

/* =====================================================================
 * 8. PUT /trips/:id — обновить поездку (водитель-владелец или админ)
 *    Обновляются ТОЛЬКО переданные поля (раньше rating/driverId затирались).
 * ===================================================================== */
router.put('/:id', requireAuth, async (req, res) => {
  const trip = await findTripOr404(req.params.id);
  if (!canManage(req.user, trip)) return res.status(403).json({ error: 'Это не ваша поездка' });

  const body = req.body || {};
  const update = pick(body, ['from', 'to', 'departureAt', 'price', 'options', 'description']);

  const stops = normalizeStops(body.stops);
  if (stops) update.stops = stops;
  const tags = normalizeTags(body.tags);
  if (tags) update.tags = tags;

  // Изменение общего числа мест: свободные места сдвигаем на разницу
  const newTotal = body.seatsTotal ?? body.seats;
  if (newTotal !== undefined) {
    const booked = trip.seatsTotal - trip.seats;
    if (Number(newTotal) < booked) {
      return res.status(400).json({ error: `Уже забронировано ${booked} мест — меньше поставить нельзя` });
    }
    update.seatsTotal = Number(newTotal);
    update.seats = Number(newTotal) - booked;
  }

  if (req.user.role === 'admin' && body.driverId !== undefined) {
    update.driver = body.driverId && isValidId(body.driverId) ? body.driverId : null;
  }

  // Model.findByIdAndUpdate(id, body, { returnDocument: 'after' }) — вернёт уже обновлённый документ
  const updated = await Trip.findByIdAndUpdate(trip._id, update, { returnDocument: 'after', runValidators: true }).populate(
    'driver',
    DRIVER_FIELDS
  );
  res.json(updated);
});

/* =====================================================================
 * 9. DELETE /trips/:id — удалить поездку (каскадно удаляются брони — см. models/Trip.js)
 * ===================================================================== */
router.delete('/:id', requireAuth, async (req, res) => {
  const trip = await findTripOr404(req.params.id);
  if (!canManage(req.user, trip)) return res.status(403).json({ error: 'Это не ваша поездка' });

  // findByIdAndDelete возвращает удалённый документ
  const deleted = await Trip.findByIdAndDelete(trip._id);
  res.json({ message: 'Поездка удалена', deleted });
});

/* 10. PATCH /trips/:id/status — завершить / отменить поездку */
router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body || {};
  if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Статус: scheduled, completed или cancelled' });
  }

  const trip = await findTripOr404(req.params.id);
  if (!canManage(req.user, trip)) return res.status(403).json({ error: 'Это не ваша поездка' });

  trip.status = status;
  if (status === 'cancelled') {
    // При отмене поездки отменяем все активные брони и освобождаем места
    await Booking.updateMany({ trip: trip._id, status: 'active' }, { status: 'cancelled' });
    trip.seats = trip.seatsTotal;
  }
  await trip.save();
  res.json(trip);
});

/* =====================================================================
 * 11. Остановки — работа с массивом вложенных документов
 * ===================================================================== */

// POST /trips/:id/stops — добавить остановку ($push)
router.post('/:id/stops', requireAuth, async (req, res) => {
  const { city, time } = req.body || {};
  if (!city) return res.status(400).json({ error: 'Укажите город остановки' });

  const trip = await findTripOr404(req.params.id);
  if (!canManage(req.user, trip)) return res.status(403).json({ error: 'Это не ваша поездка' });

  const updated = await Trip.findByIdAndUpdate(
    trip._id,
    { $push: { stops: { city, time: time || undefined } } },
    { returnDocument: 'after', runValidators: true }
  );
  res.status(201).json(updated.stops);
});

// DELETE /trips/:id/stops/:stopId — удалить остановку ($pull)
router.delete('/:id/stops/:stopId', requireAuth, async (req, res) => {
  const trip = await findTripOr404(req.params.id);
  if (!canManage(req.user, trip)) return res.status(403).json({ error: 'Это не ваша поездка' });
  if (!isValidId(req.params.stopId)) throw httpError(400, 'Некорректный id остановки');

  const updated = await Trip.findByIdAndUpdate(
    trip._id,
    { $pull: { stops: { _id: req.params.stopId } } },
    { returnDocument: 'after' }
  );
  res.json(updated.stops);
});

/* =====================================================================
 * 12. Отзывы — массив reviews внутри документа поездки
 * ===================================================================== */

// POST /trips/:id/reviews — оставить отзыв (только пассажир с бронью)
router.post('/:id/reviews', requireAuth, async (req, res) => {
  const rating = Number(req.body?.rating);
  const comment = req.body?.comment || '';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
  }

  const trip = await findTripOr404(req.params.id);

  const hasBooking = await Booking.exists({ trip: trip._id, user: req.user.id, status: 'active' });
  if (!hasBooking) return res.status(403).json({ error: 'Отзыв может оставить только пассажир этой поездки' });
  if (trip.reviews.some((r) => String(r.author) === req.user.id)) {
    return res.status(400).json({ error: 'Вы уже оставили отзыв на эту поездку' });
  }

  trip.reviews.push({ author: req.user.id, authorName: req.user.name, rating, comment });
  trip.recalcRating();
  await trip.save();

  res.status(201).json(trip.reviews[trip.reviews.length - 1]);
});

// PATCH /trips/:id/reviews/:reviewId — изменить СВОЙ отзыв.
// Пример обновления элемента внутри массива позиционным оператором $:
//   { 'reviews.$.rating': 4 } — меняется именно тот элемент, который совпал в фильтре.
router.patch('/:id/reviews/:reviewId', requireAuth, async (req, res) => {
  const { id, reviewId } = req.params;
  if (!isValidId(id) || !isValidId(reviewId)) throw httpError(400, 'Некорректный id');

  const set = {};
  if (req.body?.rating !== undefined) {
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
    }
    set['reviews.$.rating'] = rating;
  }
  if (req.body?.comment !== undefined) set['reviews.$.comment'] = String(req.body.comment);
  if (!Object.keys(set).length) return res.status(400).json({ error: 'Нечего обновлять' });
  set['reviews.$.updatedAt'] = new Date();

  const trip = await Trip.findOneAndUpdate(
    // $elemMatch гарантирует, что _id и автор совпали в ОДНОМ элементе массива
    { _id: id, reviews: { $elemMatch: { _id: reviewId, author: req.user.id } } },
    { $set: set },
    { returnDocument: 'after', runValidators: true }
  );
  if (!trip) return res.status(404).json({ error: 'Отзыв не найден или он не ваш' });

  trip.recalcRating();
  await trip.save();
  res.json(trip.reviews.id(reviewId));
});

// DELETE /trips/:id/reviews/:reviewId — удалить отзыв (автор или админ), $pull
router.delete('/:id/reviews/:reviewId', requireAuth, async (req, res) => {
  const { id, reviewId } = req.params;
  if (!isValidId(id) || !isValidId(reviewId)) throw httpError(400, 'Некорректный id');

  const pullCondition = { _id: reviewId };
  if (req.user.role !== 'admin') pullCondition.author = req.user.id;

  const before = await Trip.findById(id).select('reviews');
  if (!before) return res.status(404).json({ error: 'Поездка не найдена' });

  const trip = await Trip.findByIdAndUpdate(id, { $pull: { reviews: pullCondition } }, { returnDocument: 'after' });
  if (trip.reviews.length === before.reviews.length) {
    return res.status(404).json({ error: 'Отзыв не найден или он не ваш' });
  }

  trip.recalcRating();
  await trip.save();
  res.json({ message: 'Отзыв удалён', rating: trip.rating });
});

/* =====================================================================
 * 13. POST /trips/:id/book — забронировать места
 *     Атомарная операция: места уменьшаются только если их хватает,
 *     поэтому два одновременных запроса не «перепродадут» поездку.
 * ===================================================================== */
router.post('/:id/book', requireRole('user', 'driver'), async (req, res) => {
  const seats = Number(req.body?.seats ?? 1);
  if (!Number.isInteger(seats) || seats < 1 || seats > 4) {
    return res.status(400).json({ error: 'Можно забронировать от 1 до 4 мест' });
  }

  const trip = await findTripOr404(req.params.id);
  if (trip.driver && String(trip.driver) === req.user.id) {
    return res.status(400).json({ error: 'Нельзя бронировать собственную поездку' });
  }
  if (trip.status !== 'scheduled') return res.status(400).json({ error: 'Поездка недоступна для бронирования' });
  if (trip.departureAt <= new Date()) return res.status(400).json({ error: 'Поездка уже отправилась' });

  const existing = await Booking.findOne({ user: req.user.id, trip: trip._id, status: 'active' });
  if (existing) {
    return res.status(400).json({ error: 'У вас уже есть бронь на эту поездку — измените количество мест в «Моих бронях»' });
  }

  const updatedTrip = await Trip.findOneAndUpdate(
    { _id: trip._id, status: 'scheduled', departureAt: { $gt: new Date() }, seats: { $gte: seats } },
    { $inc: { seats: -seats } },
    { returnDocument: 'after' }
  );
  if (!updatedTrip) return res.status(400).json({ error: 'Недостаточно свободных мест' });

  const booking = await Booking.create({ user: req.user.id, trip: trip._id, seats });
  res.status(201).json({ message: 'Места забронированы', booking, trip: updatedTrip });
});

module.exports = router;
