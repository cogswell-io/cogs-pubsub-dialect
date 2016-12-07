const Joi = require('joi');

// Directive schemas
const Sequence = Joi.number().integer().required();
const Channel = Joi.string().min(1).max(128).required();
const ChannelList = Joi.array().items(Joi.alternatives().when('length', {
  is: 0,
  otherwise: Channel
})).required();
function Directive(directive) {
  return Joi.string().valid(directive).required();
}

// Response schemas
const StatusMessage = Joi.string().min(1).required();
const StatusDetails = Joi.string().allow('').optional();
function StatusCode(code) {
  return Joi.number().integer().valid(code).required();
}

// Message schemas
const Message = Joi.string().allow('').required();
const Timestamp = Joi.date().iso().required();
const UUID = Joi.string().uuid().required();

module.exports = {
  general: {
    catchAllError: {
      sequence: Sequence,
      code: StatusCode(500),
      message: StatusMessage,
      details: StatusDetails
    },
    invalidFormatError: {
      sequence: Sequence,
      code: StatusCode(400),
      message: StatusMessage,
      details: StatusDetails
    }
  },

  subscribe: {
    directive: {
      sequence: Sequence,
      directive: Directive('subscribe'),
      channel: Channel
    },
    success: {
      sequence: Sequence,
      code: StatusCode(200),
      channels: ChannelList
    },
    incorrectPermissionsError: {
      sequence: Sequence,
      code: StatusCode(401),
      message: StatusMessage,
      details: StatusDetails
    }
  },

  unsubscribe: {
    directive: {
      sequence: Sequence,
      directive: Directive('unsubscribe'),
      channel: Channel
    },
    success: {
      sequence: Sequence,
      code: StatusCode(200),
      channels: ChannelList
    },
    incorrectPermissionsError: {
      sequence: Sequence,
      code: StatusCode(401),
      message: StatusMessage,
      details: StatusDetails
    },
    notFoundError: {
      sequence: Sequence,
      code: StatusCode(404),
      message: StatusMessage,
      details: StatusDetails
    }
  },

  publish: {
    directive: {
      sequence: Sequence,
      directive: Directive('publish'),
      channel: Channel,
      message: Message
    },
    incorrectPermissionsError: {
      sequence: Sequence,
      code: StatusCode(401),
      message: StatusMessage,
      details: StatusDetails
    },
    noSubscriptionsError: {
      sequence: Sequence,
      code: StatusCode(404),
      message: StatusMessage,
      details: StatusDetails
    }
  },

  message: {
    id: UUID,
    received: Timestamp,
    channel: Channel,
    message: Message
  },

  validate: function(object, validator, callback) {
    if (typeof callback === 'function') {
      return Joi.validate(object, validator, callback);
    } else {
      return Joi.validate(object, validator);
    }
  }
};
