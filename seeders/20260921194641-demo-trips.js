'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Trips', [
      {
        from: 'Минск',
        to: 'Могилев',
        departureAt: new Date('2026-09-10T10:00:00.000Z'),
        price: 150,
        seats: 40,
        rating: 4.8,
        driverId: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        from: 'Казань',
        to: 'Москва',
        departureAt: new Date('2026-09-10T08:30:00.000Z'),
        price: 200,
        seats: 40,
        rating: 4.5,
        driverId: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        from: 'Санкт-Петербург',
        to: 'Минск',
        departureAt: new Date('2026-09-11T14:15:00.000Z'),
        price: 180,
        seats: 36,
        rating: 4.7,
        driverId: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Trips', null, {});
  }
};