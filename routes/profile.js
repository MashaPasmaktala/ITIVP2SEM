const express = require('express');
const db = require('../models');
const authenticate = require('../middleware/auth');

const router = express.Router();

// GET /profile — данные текущего пользователя
router.get('/', authenticate, async (req, res, next) => {
  try {
    const user = await db.User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'role', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;