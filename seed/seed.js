// Заполнение базы тестовыми данными: npm run seed
// ВНИМАНИЕ: перед заполнением коллекции users, trips и bookings очищаются!
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('../db');
const User = require('../models/User');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');

const PASSWORD = '123456';

// Дата относительно сегодняшнего дня: через days дней в hour:minute
const inDays = (days, hour = 9, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
};

async function seed() {
  await connectDB();

  console.log('🧹 Очищаю коллекции...');
  await Promise.all([User.deleteMany({}), Trip.deleteMany({}), Booking.deleteMany({})]);
  await Promise.all([User.syncIndexes(), Trip.syncIndexes(), Booking.syncIndexes()]); // создаём индексы

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  console.log('👤 Создаю пользователей...');
  const [admin, ivan, maria, petr, anna, oleg, kate] = await User.insertMany([
    { email: 'admin@test.com', passwordHash, role: 'admin', profile: { name: 'Администратор', city: 'Минск' } },
    {
      email: 'ivan@test.com', passwordHash, role: 'driver',
      profile: { name: 'Иван', phone: '+375291111111', city: 'Минск', bio: 'Вожу 10 лет, без происшествий. Люблю спокойную музыку.' },
      car: { brand: 'Volkswagen', model: 'Passat B7', color: 'Серый', plate: '1234 AB-7', year: 2014 },
    },
    {
      email: 'maria@test.com', passwordHash, role: 'driver',
      profile: { name: 'Мария', phone: '+375292222222', city: 'Брест', bio: 'Езжу к родителям каждые выходные, беру попутчиков.' },
      car: { brand: 'Kia', model: 'Rio', color: 'Белый', plate: '5678 KX-1', year: 2019 },
    },
    {
      email: 'petr@test.com', passwordHash, role: 'driver',
      profile: { name: 'Пётр', phone: '+375293333333', city: 'Гомель', bio: 'Опыт 15 лет. Можно с животными.' },
      car: { brand: 'Skoda', model: 'Octavia', color: 'Синий', plate: '9012 MM-3', year: 2017 },
    },
    { email: 'anna@test.com', passwordHash, role: 'user', profile: { name: 'Анна', phone: '+375294444444', city: 'Минск' } },
    { email: 'oleg@test.com', passwordHash, role: 'user', profile: { name: 'Олег', city: 'Гродно' } },
    { email: 'kate@test.com', passwordHash, role: 'user', profile: { name: 'Катя', city: 'Брест' } },
  ]);

  console.log('🚗 Создаю поездки...');
  const tripsData = [
    // --- будущие поездки ---
    {
      from: 'Минск', to: 'Брест', departureAt: inDays(1, 8, 30), price: 35, seatsTotal: 3, driver: ivan._id,
      stops: [{ city: 'Барановичи', time: inDays(1, 10, 30) }],
      options: { smoking: false, pets: false, luggage: true, music: true },
      tags: ['комфорт', 'без пересадок'], description: 'Выезд от ст. м. Партизанская.',
    },
    {
      from: 'Брест', to: 'Минск', departureAt: inDays(3, 17, 0), price: 35, seatsTotal: 3, driver: maria._id,
      stops: [{ city: 'Барановичи' }],
      options: { smoking: false, pets: true, luggage: true, music: true },
      tags: ['можно с животными'], description: 'Могу забрать с ж/д вокзала.',
    },
    {
      from: 'Минск', to: 'Гродно', departureAt: inDays(2, 7, 0), price: 30, seatsTotal: 4, driver: ivan._id,
      stops: [{ city: 'Лида' }],
      options: { smoking: false, pets: false, luggage: true, music: false },
      tags: ['утро', 'комфорт'],
    },
    {
      from: 'Гомель', to: 'Минск', departureAt: inDays(4, 6, 0), price: 40, seatsTotal: 4, driver: petr._id,
      stops: [{ city: 'Жлобин' }, { city: 'Бобруйск' }],
      options: { smoking: true, pets: true, luggage: true, music: true },
      tags: ['можно с животными', 'утро'],
    },
    {
      from: 'Минск', to: 'Вильнюс', departureAt: inDays(5, 12, 0), price: 60, seatsTotal: 3, driver: maria._id,
      options: { smoking: false, pets: false, luggage: true, music: true },
      tags: ['заграница', 'комфорт'], description: 'Нужна виза/ВНЖ. Граница Каменный Лог.',
    },
    {
      from: 'Минск', to: 'Могилёв', departureAt: inDays(6, 18, 30), price: 25, seatsTotal: 4, driver: petr._id,
      options: { smoking: false, pets: true, luggage: false, music: true },
      tags: ['вечер'],
    },
    {
      from: 'Гродно', to: 'Минск', departureAt: inDays(7, 15, 0), price: 30, seatsTotal: 3, driver: ivan._id,
      stops: [{ city: 'Лида' }, { city: 'Ивье' }],
      tags: ['без пересадок'],
    },
    {
      from: 'Минск', to: 'Витебск', departureAt: inDays(9, 9, 0), price: 28, seatsTotal: 4, driver: maria._id,
      tags: ['утро'],
    },
    // --- прошедшие поездки (для отзывов и истории) ---
    {
      from: 'Минск', to: 'Брест', departureAt: inDays(-7, 8, 0), price: 35, seatsTotal: 3, driver: ivan._id,
      status: 'completed', tags: ['комфорт'],
    },
    {
      from: 'Брест', to: 'Минск', departureAt: inDays(-5, 18, 0), price: 33, seatsTotal: 3, driver: maria._id,
      status: 'completed',
    },
    {
      from: 'Минск', to: 'Гомель', departureAt: inDays(-3, 10, 0), price: 38, seatsTotal: 4, driver: petr._id,
      status: 'completed', tags: ['можно с животными'],
    },
  ].map((t) => ({ ...t, seats: t.seatsTotal }));

  const trips = await Trip.insertMany(tripsData);
  const [t1, t2, t3, t4, , , , , p1, p2, p3] = trips;

  console.log('🎫 Создаю брони...');
  const bookingsData = [
    { user: anna._id, trip: t1._id, seats: 1 },
    { user: oleg._id, trip: t1._id, seats: 1 },
    { user: kate._id, trip: t2._id, seats: 2 },
    { user: anna._id, trip: t3._id, seats: 1 },
    { user: oleg._id, trip: t4._id, seats: 2 },
    // прошедшие
    { user: anna._id, trip: p1._id, seats: 1 },
    { user: oleg._id, trip: p1._id, seats: 2 },
    { user: kate._id, trip: p2._id, seats: 1 },
    { user: anna._id, trip: p3._id, seats: 1 },
    // отменённая бронь (для истории)
    { user: kate._id, trip: t3._id, seats: 1, status: 'cancelled' },
  ];
  await Booking.insertMany(bookingsData);

  // Уменьшаем свободные места по активным броням
  for (const b of bookingsData.filter((x) => x.status !== 'cancelled')) {
    await Trip.updateOne({ _id: b.trip }, { $inc: { seats: -b.seats } });
  }

  console.log('⭐ Добавляю отзывы...');
  const reviews = [
    [p1, anna, 5, 'Отличная поездка, Иван водит аккуратно, приехали раньше времени!'],
    [p1, oleg, 4, 'Всё хорошо, только кондиционер слабоват.'],
    [p2, kate, 5, 'Мария очень приятный водитель, рекомендую.'],
    [p3, anna, 4, 'Нормально доехали, собака Петра — лучший попутчик :)'],
  ];
  for (const [trip, author, rating, comment] of reviews) {
    const doc = await Trip.findById(trip._id);
    doc.reviews.push({ author: author._id, authorName: author.profile.name, rating, comment });
    doc.recalcRating();
    await doc.save();
  }

  console.log('\n✅ Готово! Тестовые аккаунты (пароль у всех: 123456):');
  console.table([
    { email: admin.email, role: 'admin' },
    { email: ivan.email, role: 'driver' },
    { email: maria.email, role: 'driver' },
    { email: petr.email, role: 'driver' },
    { email: anna.email, role: 'user' },
    { email: oleg.email, role: 'user' },
    { email: kate.email, role: 'user' },
  ]);

  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error('❌ Ошибка сидирования:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
