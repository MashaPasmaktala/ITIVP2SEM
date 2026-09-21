'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Drivers', [
      {
        name: 'Иван',
        phone: '+375291111111',
        experience: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Мария',
        phone: '+375292222222',
        experience: 7,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Пётр',
        phone: '+375293333333',
        experience: 15,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Drivers', null, {});
  }
};