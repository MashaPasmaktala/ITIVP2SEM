require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const db = require('./models');

// Импорт middleware
const authenticate = require('./middleware/auth');

// Импорт роутеров
const authRouter = require('./routes/auth');
const tripsRouter = require('./routes/trips');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = 3000;

// --- НАСТРОЙКА CORS И ПАРСЕРОВ ---
app.use(cors({
  origin: 'http://localhost:5173', // Разрешаем React
  credentials: true                // Разрешаем передавать куки
}));
app.use(express.json());
app.use(cookieParser());           // Парсер куки (для JWT)
app.use(express.static(path.join(__dirname, 'public')));

// --- АУТЕНТИФИКАЦИЯ (добавляет req.user, если есть токен) ---
app.use(authenticate);

// --- ПОДКЛЮЧЕНИЕ РОУТОВ ---
app.use('/auth', authRouter);
app.use('/trips', tripsRouter);
app.use('/admin', adminRouter);

// Тестовый роут
app.get('/', (req, res) => {
  res.send('Server is running');
});

// --- ОБРАБОТКА ОШИБОК ---
app.use((err, req, res, next) => {
  console.error('❌ Ошибка сервера:', err.stack);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// --- ЗАПУСК ---
(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Подключение к PostgreSQL установлено');
  } catch (err) {
    console.error('❌ Ошибка подключения к БД:', err.message);
  }
})();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});