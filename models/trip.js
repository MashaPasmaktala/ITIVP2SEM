'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Trip extends Model {
    static associate(models) {
      Trip.hasMany(models.Booking, { foreignKey: 'tripId', as: 'bookings' });
      Trip.belongsTo(models.Driver, {
        foreignKey: 'driverId',
        as: 'driver'
      });
    }
  }

  Trip.init({
    from: DataTypes.STRING,
    to: DataTypes.STRING,
    departureAt: DataTypes.DATE,
    price: DataTypes.INTEGER,
    seats: DataTypes.INTEGER,
    rating: DataTypes.FLOAT,
    driverId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Trip',
  });

  return Trip;
};