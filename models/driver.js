'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Driver extends Model {
    static associate(models) {
      Driver.hasMany(models.Trip, {
        foreignKey: 'driverId',
        as: 'trips'
      });
    }
  }

  Driver.init({
    name: DataTypes.STRING,
    phone: DataTypes.STRING,
    experience: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Driver',
  });

  return Driver;
};