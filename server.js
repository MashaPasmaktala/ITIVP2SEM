const express = require('express');
const db = require('./models');
const authRouter = require('./routes/auth');
const profileRouter = require('./routes/profile');
const adminRouter = require('./routes/admin');
const app = express();
app.use(express.json());
app.use('/profile', profileRouter);
app.use('/auth', authRouter);
app.use('/admin', adminRouter);
const PORT = 3000;

(async () => {
  try {
    await db.sequelize.authenticate();
    console.log(' Подключение к PostgreSQL установлено');
  } catch (err) {
    console.error(' Ошибка подключения к БД:', err.message);
  }
})();


app.get('/trips', async (req, res, next) => {
  try {
    const trips = await db.Trip.findAll({
      include: [{ model: db.Driver, as: 'driver' }]
    });
    res.json(trips);
  } catch (err) {
    next(err);
  }
});


app.get('/trips/:id', async (req, res, next) => {
  try {
    const trip = await db.Trip.findByPk(req.params.id, {
      include: [{ model: db.Driver, as: 'driver' }]
    });
    if (!trip) {
      return res.status(404).json({ error: 'Поездка не найдена' });
    }
    res.json(trip);
  } catch (err) {
    next(err);
  }
});


app.post('/trips', async (req, res, next) => {
  try {
    const { from, to, departureAt, price, seats, rating, driverId } = req.body;

    if (!from || !to || !departureAt || !price || !seats) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    const newTrip = await db.Trip.create({
      from,
      to,
      departureAt,
      price,
      seats,
      rating: rating || 0,
      driverId: driverId || null
    });
    res.status(201).json(newTrip);
  } catch (err) {
    next(err);
  }
});


app.put('/trips/:id', async (req, res, next) => {
  try {
    const trip = await db.Trip.findByPk(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: 'Поездка не найдена' });
    }

    const { from, to, departureAt, price, seats, rating, driverId } = req.body;

    if (!from || !to || !departureAt || !price || !seats) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    await trip.update({
      from,
      to,
      departureAt,
      price,
      seats,
      rating: rating || 0,
      driverId: driverId || null
    });
    res.json(trip);
  } catch (err) {
    next(err);
  }
});


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


app.get('/drivers', async (req, res, next) => {
  try {
    const drivers = await db.Driver.findAll({
      include: [{ model: db.Trip, as: 'trips' }]
    });
    res.json(drivers);
  } catch (err) {
    next(err);
  }
});

app.get('/', (req, res) => {
  res.send('Server is running');
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});