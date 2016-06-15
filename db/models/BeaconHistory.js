"use strict";

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('BeaconHistory', {
    url: {
      type: DataTypes.STRING,
      field: 'url',
      allowNull: false,
      validate: {
        isUrl: true,
        notEmpty: true
      }
    },
    pingTime: {
      type: DataTypes.DATE,
      field: 'ping_time'
    },
    statusCode: {
      type: DataTypes.INTEGER,
      field: 'status_code',
      validate: {
        isInt: true
      }
    }
  }, {
    tableName: 'beacon_history',
    indexes: [
      {
        fields: ['url', 'ping_time']
      },
    ]
  })
};