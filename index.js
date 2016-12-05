const Joi = require('joi');

module.exports = {
  general: {
    catchAllError: {
      sequence: Joi.number().integer().required(),
      code: Joi.any().valid(500).required(),
      message: Joi.any().valid('Internal Error').required(),
      details: Joi.string().required()
    },
    invalidFormatError: {
      sequence: Joi.number().integer().required(),
      code: Joi.any().valid(400).required(),
      message: Joi.any().valid('Invalid Format').required(),
      details: Joi.string().required()
    }
  },
  subscribe: {
    directive: {
      sequence: Joi.number().integer().required(),
      directive: Joi.any().valid('subscribe').required(),
      channel: Joi.string().required()
    },
    success: {
      sequence: Joi.number().integer().required(),
      code: Joi.any().valid(200).required(),
      channels: Joi.array().items(Joi.string()).required()
    },
    incorrectPermissionsError: {
      sequence: Joi.number().integer().required(),
      code: Joi.any().valid(401).required(),
      message: Joi.any().valid('Not Authorized').required(),
      details: Joi.string().valid(
        "You do not have read permissions on this socket, and therefore cannot subscribe to channels."
      ).required()
    }
  },
  unsubscribe: {
    directive: {
      sequence: Joi.number().integer().required(),
      directive: Joi.any().valid('unsubscribe').required(),
      channel: Joi.string().required()
    },
    success: {
      sequence: Joi.number().integer().required(),
      code: Joi.any().valid(200).required(),
      channels: Joi.array().items(Joi.string()).required()
    },
    incorrectPermissionsError: {
      sequence: Joi.number().integer().required(),
      code: Joi.any().valid(401).required(),
      message: Joi.any().valid('Not Authorized').required(),
      details: Joi.string().valid(
        "You do not have read permissions on this socket, and therefore cannot subscribe/unsubscribe to/from channels."
      ).required()
    },
    notFoundError: {
      sequence: Joi.number().integer().required(),
      code: Joi.any().valid(404).required(),
      message: Joi.any().valid("Not Found").required(),
      details: Joi.any().valid(
        "You are not subscribed to the specified channel."
      ).required()
    }
  },
  publish: {
    directive: {
      sequence: Joi.number().integer().required(),
      directive: Joi.any().valid('publish').required(),
      channel: Joi.string().required(),
      message: Joi.string().required()
    },
    incorrectPermissionsError: {
      sequence: Joi.number().integer().required(),
      code: Joi.any().valid(401).required(),
      message: Joi.any().valid('Not Authorized').required(),
      details: Joi.string().valid(
        "You do not have write permissions on this socket, and therefore cannot publish to channels."
      ).required()
    },
    noSubscriptionsError: {
      sequence: Joi.number().integer().required(),
      code: Joi.any().valid(404).required(),
      message: Joi.any().valid('Not Found').required(),
      details: Joi.any().valid(
        "There are no subscribers to the specified channel, so the message could not be delivered."
      ).required()
    }
  },
  message: {
    id: Joi.string().guid().required(),
    recieved: Joi.date().iso().required(),
    channel: Joi.string().required(),
    message: Joi.string().required()
  },
  validate: function(object, validator, callback) {
    if(typeof callback === 'function') {
      return Joi.validate(object, validator, callback);
    } else {
      return Joi.validate(object, validator);
    }
  }
};
