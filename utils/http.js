const mongoose = require('mongoose');

// Ошибка с HTTP-статусом: throw httpError(404, 'Не найдено')
// В Express 5 ошибки из async-обработчиков сами попадают в обработчик ошибок.
const httpError = (status, message) => Object.assign(new Error(message), { status });

// Проверка, что строка — валидный ObjectId (иначе Mongoose бросит CastError)
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Берём из объекта только разрешённые поля, которые реально переданы
const pick = (obj, keys) =>
  keys.reduce((acc, key) => {
    if (obj && obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});

module.exports = { httpError, isValidId, pick };
