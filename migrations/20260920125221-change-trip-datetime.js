'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Добавляем новую колонку departureAt
    await queryInterface.addColumn('Trips', 'departureAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // 2. Удаляем старые колонки date и time
    await queryInterface.removeColumn('Trips', 'date');
    await queryInterface.removeColumn('Trips', 'time');
  },

  async down(queryInterface, Sequelize) {
    // Откат: возвращаем date и time, убираем departureAt
    await queryInterface.addColumn('Trips', 'date', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('Trips', 'time', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.removeColumn('Trips', 'departureAt');
  }
};