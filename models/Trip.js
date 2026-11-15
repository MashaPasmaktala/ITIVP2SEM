const mongoose = require('mongoose');

const { Schema } = mongoose;

// Элемент массива stops — промежуточная остановка (у каждой есть свой _id)
const stopSchema = new Schema({
  city: { type: String, required: [true, 'Укажите город остановки'], trim: true },
  time: { type: Date },
});

// Элемент массива reviews — отзыв пассажира о поездке.
// Отзывы вложены прямо в документ поездки (в SQL это была бы таблица Reviews с tripId).
const reviewSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true }, // денормализация: имя хранится копией, без JOIN
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

// Вложенный документ — условия поездки
const optionsSchema = new Schema(
  {
    smoking: { type: Boolean, default: false },
    pets: { type: Boolean, default: false },
    luggage: { type: Boolean, default: true },
    music: { type: Boolean, default: true },
  },
  { _id: false }
);

const tripSchema = new Schema(
  {
    from: { type: String, required: [true, 'Укажите город отправления'], trim: true },
    to: { type: String, required: [true, 'Укажите город прибытия'], trim: true },
    departureAt: { type: Date, required: [true, 'Укажите дату отправления'] },
    price: { type: Number, required: [true, 'Укажите цену'], min: [0, 'Цена не может быть отрицательной'] },
    seatsTotal: { type: Number, required: true, min: [1, 'Минимум 1 место'], max: [8, 'Максимум 8 мест'] },
    seats: { type: Number, required: true, min: [0, 'Мест не может быть меньше 0'] }, // свободные места
    driver: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    stops: [stopSchema], // массив вложенных документов
    options: { type: optionsSchema, default: () => ({}) },
    tags: { type: [String], default: [] }, // массив строк
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    reviews: [reviewSchema], // массив вложенных документов
    rating: { type: Number, default: 0, min: 0, max: 5 },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false } }
);

// Индексы для поиска
tripSchema.index({ from: 1, to: 1, departureAt: 1 });
tripSchema.index({ driver: 1 });
tripSchema.index({ tags: 1 });

// Перед валидацией: при создании свободных мест = всего мест
tripSchema.pre('validate', function () {
  if (this.isNew && (this.seats === undefined || this.seats === null)) {
    this.seats = this.seatsTotal;
  }
  if (this.seats > this.seatsTotal) {
    this.invalidate('seats', 'Свободных мест не может быть больше, чем всего мест');
  }
});

// Instance-метод: пересчитать средний рейтинг по отзывам
tripSchema.methods.recalcRating = function () {
  if (!this.reviews.length) {
    this.rating = 0;
  } else {
    const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
    this.rating = Math.round((sum / this.reviews.length) * 10) / 10;
  }
  return this.rating;
};

// Статический метод: средний рейтинг водителя по всем его поездкам (aggregation pipeline)
tripSchema.statics.driverRating = async function (driverId) {
  const [result] = await this.aggregate([
    { $match: { driver: new mongoose.Types.ObjectId(String(driverId)) } },
    { $unwind: '$reviews' },
    { $group: { _id: '$driver', avgRating: { $avg: '$reviews.rating' }, reviewsCount: { $sum: 1 } } },
  ]);
  return result
    ? { avgRating: Math.round(result.avgRating * 10) / 10, reviewsCount: result.reviewsCount }
    : { avgRating: 0, reviewsCount: 0 };
};

// Каскадное удаление: при удалении поездки удаляются все её брони.
// Срабатывает на Trip.findByIdAndDelete() / findOneAndDelete().
tripSchema.pre('findOneAndDelete', async function () {
  const trip = await this.model.findOne(this.getFilter()).select('_id');
  if (trip) {
    await mongoose.model('Booking').deleteMany({ trip: trip._id });
  }
});

module.exports = mongoose.model('Trip', tripSchema);
