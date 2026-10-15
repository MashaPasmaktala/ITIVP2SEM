'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    static associate(models) {
      Booking.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      Booking.belongsTo(models.Trip, { foreignKey: 'tripId', as: 'trip' });
    }
  }
  Booking.init({
    userId: DataTypes.INTEGER,
    tripId: DataTypes.INTEGER,
    seats: { type: DataTypes.INTEGER, defaultValue: 1 }
  }, {
    sequelize,
    modelName: 'Booking',
  });
  return Booking;
};