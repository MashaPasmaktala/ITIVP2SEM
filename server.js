const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const db = require('./models');

const logger = require('./middleware/logger');
const authenticate = require('./middleware/auth');
const authRouter = require('./routes/auth');
const tripsRouter = require('./routes/trips');
const profileRouter = require('./routes/profile');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(logger);
app.use(authenticate);

app.use('/auth', authRouter);
app.use('/', tripsRouter);
app.use('/profile', profileRouter);
app.use('/admin', adminRouter);

(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Подключение к PostgreSQL установлено');
  } catch (err) {
    console.error('❌ Ошибка подключения к БД:', err.message);
  }
})();

app.use((req, res) => {
  res.status(404).render('404', { user: res.locals.user || null });
});

app.use((err, req, res, next) => {
  console.error('❌ Ошибка:', err.message);
  console.error(err.stack);
  try {
    res.status(500).render('500', {
      user: res.locals.user || null,
      errorMessage: err.message
    });
  } catch (renderErr) {
    console.error('Ошибка рендеринга 500:', renderErr.message);
    res.status(500).send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>500</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h1>500 — Внутренняя ошибка</h1><p><a href="/">На главную</a></p></body></html>`);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});