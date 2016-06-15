"use strict";

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Url', {
    url: {
      type: DataTypes.STRING,
      field: 'url',
      primaryKey: true,
      allowNull: false,
      validate: {
        isUrl: true,
        notEmpty: true
      }
    },
    lastViewTime: {
      type: DataTypes.DATE,
      field: 'last_view_time'
    }
  }, {
    tableName: 'urls'
  })
};