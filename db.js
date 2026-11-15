const mongoose = require('mongoose');

// Подключение к MongoDB через Mongoose.
// Строка подключения берётся из .env (MONGO_URI):
//   локально / Docker: mongodb://localhost:27017/blablacar
//   Atlas:             mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/blablacar
async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('Не задана переменная MONGO_URI в файле .env');
  }

  mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB отключена'));
  mongoose.connection.on('reconnected', () => console.log('🔁 MongoDB переподключена'));

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log(`✅ MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = connectDB;
