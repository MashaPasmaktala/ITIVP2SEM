'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    static associate(models) {
      // Связываем билет с пользователем и поездкой
      Booking.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      Booking.belongsTo(models.Trip, { foreignKey: 'tripId', as: 'trip' });
    }
  }
  Booking.init({
    userId: DataTypes.INTEGER,
    tripId: DataTypes.INTEGER,
    seats: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Booking',
  });
  return Booking;
};