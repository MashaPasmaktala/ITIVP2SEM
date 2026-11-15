const mongoose = require('mongoose');

const { Schema } = mongoose;

// Бронь хранится в отдельной коллекции и ссылается на пользователя и поездку (ref).
// Это пример «реляционного» подхода внутри MongoDB: связанные данные
// подтягиваются через populate(), как JOIN в SQL.
const bookingSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    trip: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    seats: {
      type: Number,
      required: true,
      min: [1, 'Минимум 1 место'],
      max: [4, 'Максимум 4 места в одной брони'],
      default: 1,
    },
    status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false } }
);

// Составной индекс: быстрый поиск «есть ли у пользователя бронь на эту поездку»
bookingSchema.index({ user: 1, trip: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
