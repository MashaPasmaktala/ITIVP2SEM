const express = require('express');
const User = require('../models/User');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const { isAdmin } = require('../middleware/auth');
const { httpError, isValidId } = require('../utils/http');

const router = express.Router();

// Все маршруты админки — только для admin
router.use(isAdmin);

/* GET /admin/stats — статистика через aggregation pipeline */
router.get('/stats', async (req, res) => {
  const [usersByRole, tripsByStatus, revenue, topRoutes, load, bookingsCount] = await Promise.all([
    // 1. Пользователи по ролям: $group
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),

    // 2. Поездки по статусам
    Trip.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),

    // 3. Выручка: активные брони → $lookup к поездкам → сумма seats * price
    Booking.aggregate([
      { $match: { status: 'active' } },
      { $lookup: { from: 'trips', localField: 'trip', foreignField: '_id', as: 'trip' } },
      { $unwind: '$trip' },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$seats', '$trip.price'] } },
          seatsSold: { $sum: '$seats' },
        },
      },
    ]),

    // 4. Топ-5 направлений по количеству проданных мест
    Booking.aggregate([
      { $match: { status: 'active' } },
      { $lookup: { from: 'trips', localField: 'trip', foreignField: '_id', as: 'trip' } },
      { $unwind: '$trip' },
      {
        $group: {
          _id: { from: '$trip.from', to: '$trip.to' },
          seats: { $sum: '$seats' },
          revenue: { $sum: { $multiply: ['$seats', '$trip.price'] } },
        },
      },
      { $sort: { seats: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, from: '$_id.from', to: '$_id.to', seats: 1, revenue: 1 } },
    ]),

    // 5. Средняя загрузка поездок (доля занятых мест), средняя цена и рейтинг
    Trip.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          avgLoad: { $avg: { $divide: [{ $subtract: ['$seatsTotal', '$seats'] }, '$seatsTotal'] } },
          avgPrice: { $avg: '$price' },
          avgRating: { $avg: { $cond: [{ $gt: ['$rating', 0] }, '$rating', null] } },
        },
      },
    ]),

    Booking.countDocuments({ status: 'active' }),
  ]);

  const toMap = (arr) => Object.fromEntries(arr.map((x) => [x._id, x.count]));

  res.json({
    users: toMap(usersByRole),
    trips: toMap(tripsByStatus),
    bookings: bookingsCount,
    revenue: revenue[0]?.total || 0,
    seatsSold: revenue[0]?.seatsSold || 0,
    avgLoad: Math.round((load[0]?.avgLoad || 0) * 100), // в процентах
    avgPrice: Math.round(load[0]?.avgPrice || 0),
    avgRating: Math.round((load[0]?.avgRating || 0) * 10) / 10,
    topRoutes,
  });
});

/* GET /admin/users — список пользователей (?role=driver&q=почта) */
router.get('/users', async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.q) filter.email = { $regex: String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json(users);
});

// Загрузить пользователя для изменения (себя менять нельзя)
async function loadOtherUser(req) {
  if (!isValidId(req.params.id)) throw httpError(400, 'Некорректный id пользователя');
  if (req.params.id === req.user.id) throw httpError(400, 'Нельзя изменить самого себя');
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'Пользователь не найден');
  return user;
}

/* PATCH /admin/users/:id/role — сменить роль */
router.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body || {};
  if (!['user', 'driver', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Роль: user, driver или admin' });
  }
  const user = await loadOtherUser(req);
  user.role = role;
  await user.save();
  res.json(user);
});

/* PATCH /admin/users/:id/block — заблокировать / разблокировать */
router.patch('/users/:id/block', async (req, res) => {
  const user = await loadOtherUser(req);
  user.isBlocked = req.body?.isBlocked !== undefined ? !!req.body.isBlocked : !user.isBlocked;
  await user.save();
  res.json(user);
});

/* DELETE /admin/users/:id — удалить пользователя каскадно:
 * его поездки (и брони на них), его брони (с возвратом мест) */
router.delete('/users/:id', async (req, res) => {
  const user = await loadOtherUser(req);

  // 1. Брони пользователя: возвращаем места в поездки и удаляем
  const bookings = await Booking.find({ user: user._id, status: 'active' });
  for (const b of bookings) {
    await Trip.updateOne({ _id: b.trip, status: 'scheduled' }, { $inc: { seats: b.seats } });
  }
  await Booking.deleteMany({ user: user._id });

  // 2. Поездки пользователя (как водителя) и брони на них
  const trips = await Trip.find({ driver: user._id }).select('_id');
  const tripIds = trips.map((t) => t._id);
  await Booking.deleteMany({ trip: { $in: tripIds } });
  await Trip.deleteMany({ _id: { $in: tripIds } });

  // 3. Сам пользователь
  await User.findByIdAndDelete(user._id);

  res.json({ message: 'Пользователь удалён', deletedTrips: tripIds.length, deletedBookings: bookings.length });
});

module.exports = router;
