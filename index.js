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
const Ack = Joi.boolean().optional();

// Schema generator function
function Schema(schemaObject) {
  return Joi.object().keys(schemaObject);
}

const Dialect = {
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

  'session-uuid': {
    request: Schema({
      seq: Sequence,
      action: Action('session-uuid')
    }),
    200: Schema({
      seq: Sequence,
      action: Action('session-uuid'),
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

  subscriptions: {
    request: Schema({
      seq: Sequence,
      action: Action('subscriptions')
    }),
    200: Schema({
      seq: Sequence,
      action: Action('subscriptions'),
      code: StatusCode(200),
      channels: ChannelList
    }),
    401: Schema({
      seq: Sequence,
      action: Action('subscriptions'),
      code: StatusCode(401),
      message: StatusMessage,
      details: StatusDetails
    })
  },

  pub: {
    request: Schema({
      seq: Sequence,
      action: Action('pub'),
      chan: Channel,
      msg: Message,
      ack: Ack
    }),
    200: Schema({
      seq: Sequence,
      action: Action('pub'),
      code: StatusCode(200)
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

  'invalid-request': Schema({
    action: Action('invalid-request'),
    code: StatusCode(400),
    message: StatusMessage,
    details: StatusDetails,
    bad_request: Message
  }),

  msg: Schema({
    id: UUID,
    action: Action('msg'),
    time: Timestamp,
    chan: Channel,
    msg: Message
  })
};

// Identifies the schema to use in order to validate the supplied object.
function identifySchema(obj) {
  if (obj) {
    const code = obj.code;
    const action = obj.action;
    const category = Dialect[action];

    if (category) {
      if (action === 'msg' || action == 'invalid-request') {
        // First handle the schemas which are a category unto themselves.
        return category;
      } else if (code) {
        // Then handle codes. Fall through if there is a code,
        // but it doesn't exist for the identified category.
        const categoryCode = category[code];

        if (categoryCode) {
          return categoryCode;
        }
      } else {
        // If there is no code, attempted to fetch the request sub-object.
        return category.request;
      }
    }
    
    if (code) {
      // If there is a code, but it wasn't associated with the identified
      // category (if any), then attempt to locate it in the general responses.
      let category = Dialect.general;

      if (category) {
        return category[code];
      }
    }
  }
}

// The Joi validator function.
function validate(object, validator, callback) {
  if (typeof callback === 'function') {
    return Joi.validate(object, validator, callback);
  } else {
    return Joi.validate(object, validator);
  }
}

// Validate the object, auto-detecting its schema.
function autoValidate(object) {
  const seq = (object) ? object.seq : undefined;
  const action = (object) ? object.action : undefined;

  const schema = identifySchema(object)

  if (schema) {
    const {error, value} = validate(object, schema);

    if (error) {
      return { isValid: false, seq, action, error };
    } else {
      return { isValid: true, seq, action, value };
    }
  } else {
    return { isValid: false, seq, action,
      error: new Error('No matching schema found.') };
  }
}

// Parse and validate JSON, auto-detecting its schema.
function parseAndAutoValidate(json) {
  try {
    const obj = JSON.parse(json);
    return autoValidate(obj);
  } catch (error) {
    return { isValid: false, error: error };
  }
}

module.exports = {
  autoValidate: autoValidate,
  dialect: Dialect,
  identifySchema: identifySchema,
  parseAndAutoValidate: parseAndAutoValidate,
  validate: validate
};

