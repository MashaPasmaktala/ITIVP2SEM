const express = require('express');
const db = require('./models'); // Sequelize: db.Trip, db.sequelize
const app = express();
app.use(express.json());
const PORT = 3000;

// Проверка подключения к БД при старте
(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Подключение к PostgreSQL установлено');
  } catch (err) {
    console.error('❌ Ошибка подключения к БД:', err.message);
  }
})();

// GET /trips — все поездки
app.get('/trips', async (req, res, next) => {
  try {
    const trips = await db.Trip.findAll();
    res.json(trips);
  } catch (err) {
    next(err);
  }
});

// GET /trips/:id — одна поездка
app.get('/trips/:id', async (req, res, next) => {
  try {
    const trip = await db.Trip.findByPk(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: 'Поездка не найдена' });
    }
    res.json(trip);
  } catch (err) {
    next(err);
  }
});

// POST /trips — создать
app.post('/trips', async (req, res, next) => {
  try {
    const { from, to, departureAt, price, driver, seats, rating } = req.body;

    if (!from || !to || !departureAt || !price || !driver || !seats) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    const newTrip = await db.Trip.create({
      from,
      to,
      departureAt,
      price,
      driver,
      seats,
      rating: rating || 0
    });
    res.status(201).json(newTrip);
  } catch (err) {
    next(err);
  }
});

// PUT /trips/:id — обновить
app.put('/trips/:id', async (req, res, next) => {
  try {
    const trip = await db.Trip.findByPk(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: 'Поездка не найдена' });
    }

    const { from, to, departureAt, price, driver, seats, rating } = req.body;

    if (!from || !to || !departureAt || !price || !driver || !seats) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    await trip.update({
      from,
      to,
      departureAt,
      price,
      driver,
      seats,
      rating: rating || 0
    });
    res.json(trip);
  } catch (err) {
    next(err);
  }
});

// DELETE /trips/:id — удалить
app.delete('/trips/:id', async (req, res, next) => {
  try {
    const trip = await db.Trip.findByPk(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: 'Поездка не найдена' });
    }
    await trip.destroy();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.get('/', (req, res) => {
  res.send('Server is running');
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});