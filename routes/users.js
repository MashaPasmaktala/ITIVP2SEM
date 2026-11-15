const express = require('express');
const User = require('../models/User');
const Trip = require('../models/Trip');
const { httpError, isValidId } = require('../utils/http');

const router = express.Router();

// GET /users/:id/public — публичный профиль водителя:
// имя, авто, рейтинг (aggregation), количество поездок, последние отзывы
router.get('/:id/public', async (req, res) => {
  if (!isValidId(req.params.id)) throw httpError(400, 'Некорректный id пользователя');

  const user = await User.findById(req.params.id).select('email role profile car createdAt');
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const [rating, tripsCount, lastReviews] = await Promise.all([
    Trip.driverRating(user._id),
    Trip.countDocuments({ driver: user._id }),
    // Aggregation: разворачиваем массив отзывов всех поездок водителя и берём 5 последних
    Trip.aggregate([
      { $match: { driver: user._id } },
      { $unwind: '$reviews' },
      { $sort: { 'reviews.createdAt': -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: '$reviews._id',
          route: { $concat: ['$from', ' → ', '$to'] },
          authorName: '$reviews.authorName',
          rating: '$reviews.rating',
          comment: '$reviews.comment',
          createdAt: '$reviews.createdAt',
        },
      },
    ]),
  ]);

  res.json({
    id: user.id,
    name: user.displayName,
    role: user.role,
    city: user.profile?.city || '',
    bio: user.profile?.bio || '',
    car: user.car || null,
    memberSince: user.createdAt,
    tripsCount,
    ...rating,
    lastReviews,
  });
});

module.exports = router;
