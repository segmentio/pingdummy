"use strict";

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('HealthcheckConfig', {
    ownerEmail: {
      type: DataTypes.STRING,
      field: 'owner_email',
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    url: {
      type: DataTypes.STRING,
      field: 'url',
      allowNull: false,
      validate: {
        isUrl: true,
        notEmpty: true
      }
    },
    emailValidated: {
      type: DataTypes.BOOLEAN,
      field: 'email_validated',
    }
  }, {
    tableName: 'healthcheck_configs',
    indexes: [
      {
        fields: ['owner_email', 'url']
      },
    ]
  })
}