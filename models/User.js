const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const { Schema } = mongoose;

// Вложенный документ (subdocument) — профиль пользователя.
// В PostgreSQL это были бы отдельные колонки или отдельная таблица,
// здесь профиль хранится прямо внутри документа пользователя.
const profileSchema = new Schema(
  {
    name: { type: String, trim: true, maxlength: 60, default: '' },
    phone: {
      type: String,
      trim: true,
      default: '',
      match: [/^$|^\+?[0-9\s\-()]{7,20}$/, 'Некорректный номер телефона'],
    },
    city: { type: String, trim: true, maxlength: 60, default: '' },
    bio: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: false }
);

// Вложенный документ — автомобиль водителя.
// Раньше водители лежали в отдельной таблице Drivers, теперь водитель — это
// пользователь с ролью driver, а машина вложена в его документ.
const carSchema = new Schema(
  {
    brand: { type: String, trim: true, required: [true, 'Укажите марку авто'] },
    model: { type: String, trim: true, required: [true, 'Укажите модель авто'] },
    color: { type: String, trim: true, default: '' },
    plate: { type: String, trim: true, uppercase: true, default: '' },
    year: { type: Number, min: [1980, 'Слишком старый автомобиль'], max: [2100, 'Некорректный год'] },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Email обязателен'],
      unique: true, // создаёт уникальный индекс в MongoDB
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Некорректный email'],
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: { values: ['user', 'driver', 'admin'], message: 'Неизвестная роль' },
      default: 'user',
      index: true,
    },
    isBlocked: { type: Boolean, default: false },
    profile: { type: profileSchema, default: () => ({}) },
    car: { type: carSchema, default: undefined },
  },
  {
    timestamps: true, // createdAt / updatedAt
    toJSON: {
      virtuals: true, // добавляет поле id (строковый _id) — так фронтенд не пришлось переписывать
      versionKey: false,
      transform: (doc, ret) => {
        delete ret.passwordHash; // хэш пароля никогда не уходит клиенту
        return ret;
      },
    },
  }
);

// Индекс по вложенному полю (поиск пользователей по городу: { 'profile.city': 'Минск' })
userSchema.index({ 'profile.city': 1 });

// Виртуальное поле — отображаемое имя
userSchema.virtual('displayName').get(function () {
  return this.profile?.name || this.email.split('@')[0];
});

// Instance-метод: проверка пароля
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

// Instance-метод: установка пароля (хэшируем bcrypt)
userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

// Статический метод модели: поиск по email
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: String(email).toLowerCase().trim() });
};

module.exports = mongoose.model('User', userSchema);
