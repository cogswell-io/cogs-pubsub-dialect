const Joi = require('joi');

// Actions
const AnyAction = Joi.string().min(1).required();
function Action(action) {
  return Joi.string().valid(action).required();
}

// The client's sequence number
const Sequence = Joi.number().integer().required();

// Channels
const Channel = Joi.string().min(1).max(128).required();
const ChannelList = Joi.array().items(
  Joi.alternatives().when('length', {
    is: 0,
    otherwise: Channel
  })
).required();

// Status info
const StatusMessage = Joi.string().min(1).required();
const StatusDetails = Joi.string().allow('').optional();
function StatusCode(code) {
  return Joi.number().integer().valid(code).required();
}

// Message info
const Message = Joi.string().allow('').required();
const Timestamp = Joi.date().iso().required();
const UUID = Joi.string().uuid().required();

// Schema generator function
function Schema(schemaObject) {
  return Joi.object().keys(schemaObject);
}

// Identifies the schema to use in order to validate the supplied object.
function identifySchema(obj) {
  if (obj) {
    let category = DialectModule[obj.action];
    let code = obj.code;

    if (category) {
      if (obj.action === 'msg') {
        return category;
      } else if (code) {
        return category[code];
      } else {
        return category.request;
      }
    } else if (code) {
      let category = DialectModule.general;

      if (category) {
        return category[code];
      }
    }
  }

  return undefined;
}

// Auto-Validate by the object
function parse(object) {
  const {err, value} = validate(object, identifySchema(object));

  // No error means it validated
  return _.isNil(err);
}

// The Joi validator function.
function validate(object, validator, callback) {
  if (typeof callback === 'function') {
    return Joi.validate(object, validator, callback);
  } else {
    return Joi.validate(object, validator);
  }
}

let DialectModule = {
  general: {
    500: Schema({
      seq: Sequence,
      action: AnyAction,
      code: StatusCode(500),
      message: StatusMessage,
      details: StatusDetails
    }),
    400: Schema({
      seq: Sequence,
      action: AnyAction,
      code: StatusCode(400),
      message: StatusMessage,
      details: StatusDetails
    })
  },

  'client-uuid': {
    request: Schema({
      seq: Sequence,
      action: Action('client-uuid')
    }),
    200: Schema({
      seq: Sequence,
      action: Action('client-uuid'),
      code: StatusCode(200),
      uuid: UUID
    })
  },

  subscribe: {
    request: Schema({
      seq: Sequence,
      action: Action('subscribe'),
      channel: Channel
    }),
    200: Schema({
      seq: Sequence,
      action: Action('subscribe'),
      code: StatusCode(200),
      channels: ChannelList
    }),
    401: Schema({
      seq: Sequence,
      action: Action('subscribe'),
      code: StatusCode(401),
      message: StatusMessage,
      details: StatusDetails
    })
  },

  unsubscribe: {
    request: Schema({
      seq: Sequence,
      action: Action('unsubscribe'),
      channel: Channel
    }),
    200: Schema({
      seq: Sequence,
      action: Action('unsubscribe'),
      code: StatusCode(200),
      channels: ChannelList
    }),
    401: Schema({
      seq: Sequence,
      action: Action('unsubscribe'),
      code: StatusCode(401),
      message: StatusMessage,
      details: StatusDetails
    }),
    404: Schema({
      seq: Sequence,
      action: Action('unsubscribe'),
      code: StatusCode(404),
      message: StatusMessage,
      details: StatusDetails
    })
  },

  'unsubscribe-all': {
    request: Schema({
      seq: Sequence,
      action: Action('unsubscribe-all')
    }),
    200: Schema({
      seq: Sequence,
      action: Action('unsubscribe-all'),
      code: StatusCode(200),
      channels: ChannelList
    }),
    401: Schema({
      seq: Sequence,
      action: Action('unsubscribe-all'),
      code: StatusCode(401),
      message: StatusMessage,
      details: StatusDetails
    }),
    404: Schema({
      seq: Sequence,
      action: Action('unsubscribe-all'),
      code: StatusCode(404),
      message: StatusMessage,
      details: StatusDetails
    })
  },

  pub: {
    request: Schema({
      seq: Sequence,
      action: Action('pub'),
      chan: Channel,
      msg: Message
    }),
    401: Schema({
      seq: Sequence,
      action: Action('pub'),
      code: StatusCode(401),
      message: StatusMessage,
      details: StatusDetails
    }),
    404: Schema({
      seq: Sequence,
      action: Action('pub'),
      code: StatusCode(404),
      message: StatusMessage,
      details: StatusDetails
    })
  },

  msg: Schema({
    id: UUID,
    action: Action('msg'),
    time: Timestamp,
    chan: Channel,
    msg: Message
  }),

  identifySchema,
  validate,
};

module.exports = {
  DialectModule,
  parse
}
