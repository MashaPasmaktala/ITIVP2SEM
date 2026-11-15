require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./db');

// Middleware
const authenticate = require('./middleware/auth');

// Роутеры
const authRouter = require('./routes/auth');
const tripsRouter = require('./routes/trips');
const profileRouter = require('./routes/profile');
const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

if (!process.env.JWT_SECRET) {
  console.error('❌ Не задан JWT_SECRET в .env (скопируйте .env.example в .env)');
  process.exit(1);
}

// --- CORS И ПАРСЕРЫ ---
app.use(cors({ origin: CLIENT_URL, credentials: true })); // credentials — чтобы ходили cookie
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// --- АУТЕНТИФИКАЦИЯ (кладёт req.user, если есть токен) ---
app.use(authenticate);

// --- РОУТЫ ---
app.use('/auth', authRouter);
app.use('/trips', tripsRouter);
app.use('/profile', profileRouter);
app.use('/users', usersRouter);
app.use('/admin', adminRouter);

// Проверка состояния сервера и БД
app.get('/', (req, res) => {
  res.json({
    status: 'Server is running',
    db: mongoose.connection.readyState === 1 ? 'MongoDB connected' : 'MongoDB disconnected',
  });
});

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ error: `Маршрут ${req.method} ${req.originalUrl} не найден` });
});

// --- ОБРАБОТКА ОШИБОК ---
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Ошибки валидации схемы Mongoose
  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages.join('; ') });
  }
  // Неверный формат ObjectId и т.п.
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: `Некорректное значение поля ${err.path}` });
  }
  // Нарушение уникального индекса (например, email уже занят)
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Запись с такими данными уже существует' });
  }
  // Битый JSON в теле запроса
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Некорректный JSON в теле запроса' });
  }
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error('❌ Ошибка сервера:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// --- ЗАПУСК: сначала подключаемся к БД, потом слушаем порт ---
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Ошибка подключения к MongoDB:', err.message);
    console.error('   Проверьте, что MongoDB запущена (docker compose up -d) и MONGO_URI в .env верный');
    process.exit(1);
  });
