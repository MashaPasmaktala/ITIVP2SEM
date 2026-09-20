'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Trips', [
      {
        from: 'Минск',
        to: 'Могилев',
        departureAt: new Date('2026-09-10T10:00:00.000Z'),
        price: 150,
        driver: 'Иван',
        seats: 40,
        rating: 4.8,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        from: 'Казань',
        to: 'Москва',
        departureAt: new Date('2026-09-10T08:30:00.000Z'),
        price: 200,
        driver: 'Мария',
        seats: 40,
        rating: 4.5,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        from: 'Санкт-Петербург',
        to: 'Минск',
        departureAt: new Date('2026-09-11T14:15:00.000Z'),
        price: 180,
        driver: 'Пётр',
        seats: 36,
        rating: 4.7,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Trips', null, {});
  }
};