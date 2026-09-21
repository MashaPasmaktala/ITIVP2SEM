'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Trips', 'driverId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Drivers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Trips', 'driverId');
  }
};