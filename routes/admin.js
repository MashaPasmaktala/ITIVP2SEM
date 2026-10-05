const express = require('express');
const db = require('../models');
const authenticate = require('../middleware/auth');
const { isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/users', authenticate, isAdmin, async (req, res, next) => {
  try {
    const users = await db.User.findAll({
      attributes: ['id', 'email', 'role', 'createdAt']
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.delete('/drivers/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const driver = await db.Driver.findByPk(req.params.id);
    if (!driver) {
      return res.status(404).json({ error: 'Водитель не найден' });
    }
    await driver.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;