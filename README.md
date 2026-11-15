# 🚗 Попутчик — сервис совместных поездок (аналог BlaBlaCar)

Курсовой проект по ИТИВП. **Ветка `26` — Лабораторная работа №6: интеграция с MongoDB (Mongoose).**

Водители публикуют поездки, пассажиры ищут их и бронируют места, после поездки оставляют отзывы. Администратор видит статистику и управляет пользователями.

| Часть | Технологии |
|---|---|
| Сервер | Node.js, Express 5, **MongoDB + Mongoose 9**, JWT (HttpOnly cookie), bcrypt |
| Клиент | React 19, Vite, React Router, Axios |
| База | MongoDB 7 в Docker (или MongoDB Atlas) |

---

## Содержание
1. [Быстрый старт (Windows + VS Code)](#1-быстрый-старт-windows--vs-code)
2. [Тестовые аккаунты](#2-тестовые-аккаунты)
3. [Что изменилось в лабе 6](#3-что-изменилось-в-лабе-6)
4. [Исправленные ошибки](#4-исправленные-ошибки-из-прошлых-лаб)
5. [Новые возможности](#5-новые-возможности)
6. [Модель данных: PostgreSQL → MongoDB](#6-модель-данных-postgresql--mongodb)
7. [Что показывать на защите](#7-что-показывать-на-защите-лабы-6)
8. [MongoDB Compass и Atlas](#8-mongodb-compass-и-atlas)
9. [Описание API](#9-описание-api)
10. [Структура проекта](#10-структура-проекта)
11. [Частые проблемы](#11-частые-проблемы)
12. [Как залить в GitHub](#12-как-залить-в-github-ветка-26)

Ответы на контрольные вопросы: [docs/kontrolnye-voprosy.md](docs/kontrolnye-voprosy.md)

---

## 1. Быстрый старт (Windows + VS Code)

### Что нужно установить один раз
- **Node.js 20+** — https://nodejs.org (LTS)
- **Docker Desktop** — https://www.docker.com/products/docker-desktop/ (при установке оставить галочку WSL 2)
- **MongoDB Compass** (по желанию, для скриншотов в отчёт) — https://www.mongodb.com/try/download/compass

VS Code при открытии проекта сам предложит полезные расширения (MongoDB, REST Client, Docker) — соглашайся.

### Запуск
Открой папку проекта в VS Code → **Terminal → New Terminal** (это PowerShell) и выполни по очереди:

```powershell
# 0. Переключиться на ветку лабы (если ещё не на ней)
git checkout 26

# 1. Запустить MongoDB в Docker (Docker Desktop должен быть запущен — значок кита в трее)
docker compose up -d

# 2. Создать файл с настройками
Copy-Item .env.example .env

# 3. Установить зависимости сервера и клиента
npm run install:all

# 4. Заполнить базу тестовыми данными
npm run seed

# 5. Запустить сервер и клиент одной командой
npm run dev:all
```

Готово:
- 🌐 Сайт: **http://localhost:5173**
- ⚙️ API: **http://localhost:3000** (должно ответить `{"status":"Server is running","db":"MongoDB connected"}`)
- 🗄️ Просмотр базы в браузере (mongo-express): **http://localhost:8081** (логин `admin`, пароль `pass`)

> Сервер и клиент можно запускать и в двух отдельных терминалах: `npm run dev` (сервер) и `npm run client` (клиент).
>
> Остановить базу: `docker compose down`. Данные при этом сохраняются. Удалить и данные: `docker compose down -v`.
>
> `npm run seed` можно запускать сколько угодно раз — он **очищает** базу и заливает тестовые данные заново (даты поездок считаются от сегодняшнего дня).

---

## 2. Тестовые аккаунты

Пароль у всех: **`123456`**

| Email | Роль | Что может |
|---|---|---|
| `admin@test.com` | Админ | Статистика, управление пользователями, редактирование/удаление любых поездок и отзывов |
| `ivan@test.com` | Водитель | Публикует свои поездки, видит пассажиров, управляет остановками и статусом |
| `maria@test.com` | Водитель | — « — |
| `petr@test.com` | Водитель | — « — |
| `anna@test.com` | Пассажир | Ищет и бронирует поездки, меняет/отменяет брони, оставляет отзывы |
| `oleg@test.com` | Пассажир | — « — |
| `kate@test.com` | Пассажир | — « — |

Любой новый пользователь может стать водителем: **Профиль → «Стать водителем»** (нужно указать машину).

---

## 3. Что изменилось в лабе 6

По заданию: «создать копию сервера, заменив Sequelize на Mongoose». PostgreSQL-версия осталась в ветке `lab5`.

**Удалено:** `config/`, `migrations/`, `seeders/`, `.sequelizerc`, `models/index.js`, пакеты `sequelize`, `sequelize-cli`, `pg`, `pg-hstore`.

**Добавлено:**

| Файл | Что внутри |
|---|---|
| `db.js` | Подключение `mongoose.connect(process.env.MONGO_URI)` |
| `models/User.js` | Схема пользователя: **вложенные документы** `profile` и `car`, уникальный индекс по email, instance-методы `comparePassword`/`setPassword`, статический метод `findByEmail`, виртуальное поле `displayName` |
| `models/Trip.js` | Схема поездки: **массивы** `stops`, `reviews`, `tags`, **вложенный документ** `options`, индексы, метод `recalcRating`, статический метод `driverRating` (aggregation), **каскадное удаление** броней в `pre('findOneAndDelete')` |
| `models/Booking.js` | Бронь — отдельная коллекция со ссылками `ref` на User и Trip (для `populate`) |
| `seed/seed.js` | Заполнение базы: 7 пользователей, 11 поездок, брони, отзывы |
| `docker-compose.yml` | MongoDB 7 + веб-интерфейс mongo-express |
| `requests.http` | Все запросы для расширения REST Client в VS Code |
| `docs/postman_collection.json` | Коллекция для Postman (Import → файл) |
| `docs/kontrolnye-voprosy.md` | Ответы на 16 контрольных вопросов |

**Что осталось как было** (основная логика): Express-роутеры `/auth`, `/trips`, `/admin`; JWT в HttpOnly cookie + заголовок `Authorization: Bearer`; роли; бронирование через `POST /trips/:id/book`; брони в `/trips/my-bookings`; React-компоненты `TripList`, `MyBookings`, `Login`, `Register`, `AuthContext`; оптимистичный UI при добавлении, редактировании и удалении.

В Mongoose-схемах включено `toJSON: { virtuals: true }`, поэтому у каждого документа кроме `_id` есть поле `id`, и фронтенд почти не пришлось переписывать.

---

## 4. Исправленные ошибки из прошлых лаб

| # | Было | Стало |
|---|---|---|
| 1 | `PUT /trips/:id` затирал `rating` (ставил 0) и `driverId` (ставил null), если их не передали | Обновляются только переданные поля |
| 2 | **Гонка при бронировании**: проверка мест и уменьшение — два отдельных запроса, два человека могли купить последнее место | Атомарный `findOneAndUpdate({ seats: { $gte: n } }, { $inc: { seats: -n } })` |
| 3 | Можно было забронировать поездку, которая уже уехала | Проверка `departureAt > now` и статуса поездки |
| 4 | Время показывалось по UTC (`toISOString().slice(0,16)`) — сдвиг на 3 часа | Время форматируется в локальном поясе |
| 5 | Middleware `authenticate` выполнялся дважды на каждый запрос (глобально и в роуте) — лишний запрос в БД | Глобальный `authenticate` + отдельные `requireAuth` / `requireRole` |
| 6 | `dotenv` был в devDependencies, а нужен при запуске | Перенесён в dependencies |
| 7 | Захардкоженные адреса (`localhost:5173`, `localhost:3000/auth/logout`, порт) | Всё через `.env` (`PORT`, `CLIENT_URL`, `VITE_API_URL`) |
| 8 | Выход через `GET /auth/logout` с редиректом на захардкоженный адрес | `POST /auth/logout` → JSON, клиент сам чистит состояние |
| 9 | На клиенте проверялась роль `manager`, которой на сервере нет | Убрано, вместо неё полноценная роль `driver` |
| 10 | Роутер `routes/profile.js` был написан, но не подключён в `server.js` | Подключён и расширен |
| 11 | Без файла `client/.env` `baseURL` был `undefined` и запросы шли не туда | Значение по умолчанию `http://localhost:3000` + `client/.env.example` |
| 12 | Сервер стартовал, даже если база недоступна | Сначала подключение к БД, потом `listen`; понятное сообщение об ошибке |
| 13 | Не было серверной валидации (формат email, длина пароля и т.п.) | Валидация в схемах Mongoose + проверки в роутах, понятные ответы 400/409 |
| 14 | «Мои билеты» падали, если поездку удалили (`b.trip.from` у `null`) | Каскадное удаление броней + проверка на `null` |
| 15 | Отмена брони физически удаляла запись — терялась история | У брони есть статус `active` / `cancelled`, история сохраняется |
| 16 | Не было обработчика 404 и разбора ошибок БД | 404 для неизвестных маршрутов; ошибки валидации/CastError → 400, дубликат → 409 |

---

## 5. Новые возможности

### 👤 Пассажир
- Поиск поездок **на сервере**: откуда, куда, дата, максимальная цена, количество мест, тег; сортировка (время, цена, рейтинг, новые); **пагинация**
- Страница поездки: маршрут с остановками, условия (курение, животные, багаж, музыка), теги, водитель с машиной и рейтингом
- Бронирование **нескольких мест** (1–4), изменение количества мест, отмена брони
- «Мои брони»: вкладки «Предстоящие» и «История», телефон водителя после брони
- **Отзывы** с оценкой 1–5: оставить, отредактировать, удалить; рейтинг поездки пересчитывается
- Публичный профиль водителя: рейтинг по всем поездкам, последние отзывы
- **Профиль**: имя, телефон, город, «о себе», смена пароля, кнопка «Стать водителем»

### 🚘 Водитель
- Публикация поездок: остановки, теги, условия, комментарий
- «Мои поездки»: статистика (поездки, пассажиры, заработок), список пассажиров
- Редактирование и удаление своих поездок, добавление и удаление остановок
- Статус поездки: завершить или отменить (при отмене все брони отменяются, места освобождаются)
- Данные автомобиля в профиле

### 🛠 Администратор
- Дашборд на **aggregation pipeline**: выручка, продано мест, средняя загрузка, средний рейтинг, топ-5 направлений, пользователи по ролям, поездки по статусам
- Управление пользователями: поиск, фильтр по роли, смена роли, блокировка (заблокированный не может войти), удаление с каскадом
- Редактирование и удаление любых поездок и отзывов

---

## 6. Модель данных: PostgreSQL → MongoDB

### Было в PostgreSQL (ветка `lab5`) — 4 таблицы
```
Users    (id, email, passwordHash, role)
Drivers  (id, name, phone, experience)
Trips    (id, from, to, departureAt, price, seats, rating, driverId → Drivers.id)
Bookings (id, userId → Users.id, tripId → Trips.id, seats)
```
Чтобы показать поездку с водителем и бронями, нужен `JOIN` трёх таблиц. Для остановок, отзывов и тегов понадобились бы ещё таблицы `Stops`, `Reviews`, `TripTags`.

### Стало в MongoDB — 3 коллекции
**`trips`** — всё о поездке в одном документе:
```js
{
  _id: ObjectId("6af9f5cdc572a2c721a004b1"),
  from: "Минск", to: "Брест",
  departureAt: ISODate("2026-11-16T05:30:00Z"),
  price: 35, seatsTotal: 3, seats: 1,
  driver: ObjectId("6af9f5cd..."),                 // ссылка на users (populate)
  stops: [                                          // массив вложенных документов
    { _id: ObjectId("..."), city: "Барановичи", time: ISODate("...") }
  ],
  options: { smoking: false, pets: false, luggage: true, music: true },  // вложенный документ
  tags: ["комфорт", "без пересадок"],               // массив строк
  reviews: [                                        // массив вложенных документов
    { _id: ObjectId("..."), author: ObjectId("..."), authorName: "Анна",
      rating: 5, comment: "Отлично!", createdAt: ISODate("...") }
  ],
  rating: 5, status: "scheduled",
  createdAt: ISODate("..."), updatedAt: ISODate("...")
}
```
**`users`** — водитель теперь просто пользователь с ролью `driver`, машина вложена в документ:
```js
{
  _id: ObjectId("..."), email: "ivan@test.com", passwordHash: "$2b$10$...", role: "driver", isBlocked: false,
  profile: { name: "Иван", phone: "+375291111111", city: "Минск", bio: "..." },
  car: { brand: "Volkswagen", model: "Passat B7", color: "Серый", plate: "1234 AB-7", year: 2014 }
}
```
**`bookings`** — отдельная коллекция со ссылками (`ref`) на пользователя и поездку: `{ user, trip, seats, status }`.

### Почему так
| Данные | Как хранится | Почему |
|---|---|---|
| Остановки, условия, теги | Внутри поездки | Читаются всегда вместе с поездкой, своей жизни не имеют |
| Отзывы | Внутри поездки (массив) | На одну поездку их немного (≤ числа мест), показываются вместе с ней |
| Профиль и машина | Внутри пользователя | Связь 1:1, отдельная таблица не нужна |
| Брони | Отдельная коллекция + `populate` | Нужны и со стороны пассажира («мои брони»), и со стороны поездки; часто меняются |

---

## 7. Что показывать на защите лабы 6

Перед защитой: `docker compose up -d` → `npm run seed` → `npm run dev:all`.

**1. Подключение к MongoDB**
- Файл `.env` со строкой `MONGO_URI` (для отчёта — скриншот)
- `db.js` — `mongoose.connect(...)`
- В терминале при старте сервера: `✅ MongoDB connected: localhost/blablacar`

**2. Схемы и модели** — открыть `models/Trip.js` и `models/User.js`, показать:
- вложенный документ (`options`, `profile`, `car`) и массивы (`stops`, `reviews`, `tags`)
- валидацию (`required`, `min`, `max`, `enum`, `match`)
- индексы (`unique: true` у email, `tripSchema.index(...)`)
- методы: `comparePassword` (instance), `findByEmail` и `driverRating` (static)
- каскадное удаление `pre('findOneAndDelete')`

**3. CRUD в Postman** (Import → `docs/postman_collection.json`, запускать по порядку сверху вниз). Либо открыть `requests.http` в VS Code и нажимать «Send Request».

| Операция | Запрос | Метод Mongoose | Где в коде |
|---|---|---|---|
| GET список | `GET /trips` | `Trip.find().where().sort().skip().limit()` | `routes/trips.js` п.1 |
| GET по id | `GET /trips/:id` | `Trip.findById().populate('driver')` | п.6 |
| POST | `POST /trips` | `Trip.create()` | п.7 |
| PUT | `PUT /trips/:id` | `Trip.findByIdAndUpdate(id, body, { returnDocument: 'after' })` | п.8 |
| DELETE | `DELETE /trips/:id` | `Trip.findByIdAndDelete()` — возвращает удалённый документ | п.9 |

> Для POST, PUT и DELETE нужен токен водителя: сначала выполни «Вход водителем», коллекция сама подставит токен.

**4. Работа с вложенными массивами** (обязательный пункт задания)
- `POST /trips/:id/stops` → `$push` в массив `stops`
- `DELETE /trips/:id/stops/:stopId` → `$pull` из массива
- `POST /trips/:id/reviews` → добавление отзыва в массив `reviews`
- **`PATCH /trips/:id/reviews/:reviewId` → обновление ЭЛЕМЕНТА массива позиционным оператором `$`:**
  ```js
  Trip.findOneAndUpdate(
    { _id: id, reviews: { $elemMatch: { _id: reviewId, author: userId } } },
    { $set: { 'reviews.$.rating': 4, 'reviews.$.comment': '...' } }
  )
  ```
- Аналог «увеличить количество товара в корзине»: `PATCH /trips/my-bookings/:id { seats: 2 }` — места меняются через `$inc`

**5. Данные в Compass / mongo-express** — открыть коллекцию `trips`, развернуть документ и показать вложенные `stops`, `reviews`, `options`; в `users` — `profile` и `car`. Во вкладке **Indexes** коллекций `trips` и `users` видны созданные индексы.

**6. Отличие от реляционной модели** — раздел 6 этого README: 4 таблицы и JOIN против одного документа с вложенными данными.

**7. Бонус для курсового** — показать в браузере:
- поиск с фильтрами и пагинацией
- бронирование нескольких мест; попытка забронировать больше, чем есть → ошибка
- отзыв и пересчёт рейтинга
- «Стать водителем» → публикация поездки
- админку со статистикой (`GET /admin/stats` — aggregation с `$group`, `$lookup`, `$unwind`, `$sort`, `$limit`)

---

## 8. MongoDB Compass и Atlas

### Compass (локальная база в Docker)
1. Открыть Compass → **New connection**
2. URI: `mongodb://localhost:27017` → **Connect**
3. База `blablacar` → коллекции `users`, `trips`, `bookings`

### MongoDB Atlas (облако — нужен скриншот дашборда для отчёта)
1. Зарегистрироваться на https://www.mongodb.com/cloud/atlas → создать бесплатный кластер **M0**
2. **Database Access** → добавить пользователя БД с паролем
3. **Network Access** → **Add IP Address** → `Allow access from anywhere` (0.0.0.0/0)
4. **Connect → Drivers** → скопировать строку подключения
5. В `.env` закомментировать локальный `MONGO_URI` и вставить свой:
   ```
   MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/blablacar?retryWrites=true&w=majority
   ```
6. `npm run seed` → `npm run dev` — данные появятся в Atlas (**Browse Collections**)

Код менять не нужно, меняется только строка подключения.

---

## 9. Описание API

🔓 — всем, 👤 — авторизованным, 🚘 — водителю (своей поездкой) или админу, 🛠 — админу

### Авторизация `/auth`
| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| POST | `/auth/register` | 🔓 | Регистрация `{ email, password, name }` |
| POST | `/auth/login` | 🔓 | Вход, ставит cookie `token` и возвращает `{ token, user }` |
| POST | `/auth/logout` | 🔓 | Выход (очистка cookie) |
| GET | `/auth/me` | 👤 | Текущий пользователь |

### Поездки `/trips`
| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/trips` | 🔓 | Поиск: `from, to, date, minPrice, maxPrice, seats, tag, sort, page, limit, all` |
| GET | `/trips/:id` | 🔓 | Поездка + рейтинг водителя (+ пассажиры для владельца, + моя бронь) |
| POST | `/trips` | 🚘 | Создать |
| PUT | `/trips/:id` | 🚘 | Изменить (только переданные поля) |
| DELETE | `/trips/:id` | 🚘 | Удалить (брони удаляются каскадно) |
| PATCH | `/trips/:id/status` | 🚘 | `{ status: completed / cancelled }` |
| POST | `/trips/:id/stops` | 🚘 | Добавить остановку (`$push`) |
| DELETE | `/trips/:id/stops/:stopId` | 🚘 | Удалить остановку (`$pull`) |
| POST | `/trips/:id/reviews` | 👤 | Отзыв (только пассажир этой поездки, один раз) |
| PATCH | `/trips/:id/reviews/:reviewId` | 👤 | Изменить свой отзыв (позиционный `$`) |
| DELETE | `/trips/:id/reviews/:reviewId` | 👤 | Удалить свой отзыв (админ — любой) |
| POST | `/trips/:id/book` | 👤 | Забронировать `{ seats: 1..4 }` |
| GET | `/trips/my-bookings` | 👤 | Мои брони |
| PATCH | `/trips/my-bookings/:id` | 👤 | Изменить количество мест |
| DELETE | `/trips/my-bookings/:id` | 👤 | Отменить бронь |
| GET | `/trips/driver/mine` | 🚘 | Мои поездки как водителя + пассажиры |

### Профиль и пользователи
| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/profile` | 👤 | Мой профиль |
| PUT | `/profile` | 👤 | Изменить `{ profile: {...}, car: {...} }` |
| PUT | `/profile/password` | 👤 | Сменить пароль `{ oldPassword, newPassword }` |
| POST | `/profile/become-driver` | 👤 | Стать водителем `{ car: { brand, model, ... } }` |
| GET | `/users/:id/public` | 🔓 | Публичный профиль водителя с рейтингом |

### Админ `/admin`
| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/admin/stats` | 🛠 | Статистика (aggregation) |
| GET | `/admin/users` | 🛠 | Пользователи `?role=&q=` |
| PATCH | `/admin/users/:id/role` | 🛠 | Сменить роль |
| PATCH | `/admin/users/:id/block` | 🛠 | Заблокировать / разблокировать |
| DELETE | `/admin/users/:id` | 🛠 | Удалить вместе с поездками и бронями |

---

## 10. Структура проекта

```
├── server.js              # точка входа: middleware, роуты, обработка ошибок, запуск
├── db.js                  # подключение к MongoDB
├── models/                # Mongoose-схемы: User, Trip, Booking
├── routes/                # auth, trips, profile, users, admin
├── middleware/auth.js     # authenticate, requireAuth, requireRole, isAdmin
├── utils/http.js          # вспомогательные функции (ошибки, проверка ObjectId)
├── seed/seed.js           # тестовые данные
├── docker-compose.yml     # MongoDB + mongo-express
├── requests.http          # запросы для VS Code REST Client
├── docs/                  # коллекция Postman, ответы на контрольные вопросы
└── client/                # React-приложение
    └── src/
        ├── api.js                 # все запросы к серверу (axios)
        ├── utils.js               # форматирование дат, подписи
        ├── context/AuthContext.jsx
        ├── components/            # TripList, TripCard, TripForm, SeatsBooking, MyBookings, Login, Register, Stars
        └── pages/                 # TripDetails, DriverTrips, Profile, DriverProfile, AdminPanel
```

---

## 11. Частые проблемы

| Проблема | Решение |
|---|---|
| `docker: command not found` / `error during connect` | Запусти Docker Desktop и дождись, пока кит в трее перестанет мигать |
| Docker Desktop просит WSL | В PowerShell **от администратора**: `wsl --install`, перезагрузить ПК |
| `❌ Ошибка подключения к MongoDB` | Проверь `docker ps` — должен быть контейнер `blablacar-mongo`. Если нет: `docker compose up -d` |
| `❌ Не задан JWT_SECRET` | Не создан `.env`: `Copy-Item .env.example .env` |
| `port 27017 is already allocated` | Уже установлен локальный MongoDB. Либо останови его (Службы → MongoDB → Остановить), либо просто не запускай Docker — `.env` подойдёт и для локальной базы |
| `EADDRINUSE :3000` / `:5173` | Порт занят старым процессом — закрой другие терминалы или перезапусти VS Code |
| `npm run ...` ругается на Execution Policy | В PowerShell: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| Ошибка при `npm install` у `bcrypt` | Удали `node_modules` и выполни `npm install` ещё раз; проверь, что Node.js 20+ (`node -v`) |
| На сайте «Ошибка загрузки — сервер запущен?» | Сервер не запущен или упал — смотри терминал с `[server]` |
| После `seed` «неверный пароль» | Пароль у всех тестовых аккаунтов `123456` |

---

## 12. Как залить в GitHub (ветка 26)

```powershell
git push -u origin 26
```
После этого на GitHub в списке веток появится `26` — ссылку на неё прикладывать к отчёту.
