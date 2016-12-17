/*jshint: expr: true*/

const expect = require('chai').expect;

const _ = require('lodash');
const Joi = require('joi');
const uuid = require('uuid');

const dialect = require('../index');

function testWithInvalid(object, value, validator) {
  const newObject = Object.assign({}, object, value);

  const result = Joi.validate(newObject, validator);
  expect(result.error).to.not.be.null;
  expect(result.value).to.have.all.keys(Object.keys(newObject));
}

function testWithValid(object, value, validator) {
  const newObject = Object.assign({}, object, value);

  const result = Joi.validate(newObject, validator);
  expect(result.error).to.be.null;
  expect(result.value).to.have.all.keys(Object.keys(newObject));
}

function tryMultipleInvalidValues(valid, invalidObjects, validator) {
  _.each(invalidObjects, function(invalidObject) {
    it(`should fail when ${Object.keys(invalidObject)[0]} is '${invalidObject[Object.keys(invalidObject)[0]]}'`, function() {
      testWithInvalid(valid, invalidObject, validator);
    });
  });
}

function tryMultipleValidValues(valid, validObjects, validator) {
  _.each(validObjects, function(validObject) {
    it(`should pass when ${Object.keys(validObject)[0]} is '${validObject[Object.keys(validObject)[0]]}'`, function() {
      testWithValid(valid, validObject, validator);
    });
  });
}

function automaticSchemaIdentification(object) {
  it('should correctly identify schemas for valid records', function() {
    let schema = dialect.identifySchema(object);

    if (!schema) {
      console.error("Error identifying schema for object:\n", object);
    }

    expect(schema).to.not.be.undefined;
    expect(schema).to.not.be.null;

    const result = Joi.validate(object, schema);

    expect(result.error).to.be.null;
    expect(result.value).to.have.all.keys(Object.keys(object));
  });
}

function passWhenValid(object, validator) {
  const result = Joi.validate(object, validator);
  expect(result.error).to.be.null;
  expect(result.value).to.have.all.keys(Object.keys(object));
}

function validateIncorrectPermissions(errorMessage, action, validator) {
  describe('incorrect permissions response', function() {
    genericValidationTest({
      seq: 12345,
      action,
      code: 401,
      message: 'Not Authorized',
      details: errorMessage
    }, [
    ], [
      {seq: 'not an integer'},
      {code: 300}, // not 401
      {action: 'very-likely-not-a-valid-action'},
      {message: ''}, // zero-length string
      {details: 999} // not a a string
    ], validator);
  });
}

function genericValidationTest(valid, valids, invalids, validator) {
  it('should pass when valid', function() {
    passWhenValid(valid, validator);
  });

  automaticSchemaIdentification(valid);

  tryMultipleValidValues(valid, valids, validator);

  tryMultipleInvalidValues(valid, invalids, validator);
}

describe('Parse and Auto-validate', function() {
  it('should succeed with a valid record', function () {
    const record = {
      seq: 1,
      action: 'pub',
      chan: 'channel-a',
      msg: 'message-a'
    };
    const validateResult = dialect.autoValidate(record);

    expect(validateResult.isValid).to.equal(true);
    expect(validateResult.error).to.be.undefined;
    expect(validateResult.value).to.deep.equal(record);

    const json = JSON.stringify(record);
    const parseResult = dialect.parseAndAutoValidate(json);

    expect(parseResult.isValid).to.equal(true);
    expect(parseResult.error).to.be.undefined;
    expect(parseResult.value).to.deep.equal(record);
  });

  it('should fail as expected with identified, invalid record', function () {
    const record = {
      seq: 1,
      action: 'pub',
      chan: 5,
      msg: 'message-a'
    };
    const validateResult = dialect.autoValidate(record);

    expect(validateResult.isValid).to.equal(false);
    expect(validateResult.value).to.be.undefined;
    expect(validateResult.error).to.not.be.undefined;
  });

  it('should fail as expected with an unidentified record', function () {
    const record = {
      seq: 1,
      action: 'public',
      chan: 'channel-a',
      msg: 'message-a'
    };
    const validateResult = dialect.autoValidate(record);

    expect(validateResult.isValid).to.equal(false);
    expect(validateResult.value).to.be.undefined;
    expect(validateResult.error).to.not.be.undefined;
  });

  it('should fail as expected with invalid JSON', function () {
    const json = "{this_be: invalid_json}";
    const parseResult = dialect.parseAndAutoValidate(json);

    expect(parseResult.isValid).to.equal(false);
    expect(parseResult.value).to.be.undefined;
    expect(parseResult.error).to.not.be.undefined;
  });
});

describe('General Responses: ', function() {

  describe('catch-all error response', function() {
    const validResponse = {
      seq: 12345,
      code: 500,
      action: 'anything',
      message: 'Internal Error',
      details: 'any string'
    };

    const validValues = [
    ];

    const invalidValues = [
      {action: ''},
      {action: undefined},
      {action: null},

      {code: undefined},
      {code: null},
      {code: 300},

      {message: ''},
      {message: true},
      {message: null},
      {message: undefined},

      {seq: undefined},
      {seq: null},
      {seq: 'not an integer'},
      {seq: 1.5},

      {details: 3}
    ];

    const validator = dialect.dialect.general[500];

    genericValidationTest(validResponse, validValues, invalidValues, validator);
  });

  describe('invalid directive response', function() {

    const validResponse = {
      seq: 12345,
      action: 'anything',
      code: 400,
      message: 'Invalid Format',
      details: 'any string'
    };

    const validValues = [
    ];

    const invalidValues = [
      {action: ''},
      {action: undefined},
      {action: null},

      {code: undefined},
      {code: null},
      {code: 300},

      {message: null},
      {message: undefined},
      {message: true},
      {message: ''},

      {seq: null},
      {seq: undefined},
      {seq: 'not an integer'},
      {seq: 1.5}, // not an integer

      {details: 3} // not a string
    ];

    const validator = dialect.dialect.general[400];

    genericValidationTest(validResponse, validValues, invalidValues, validator);
  });
});

describe('Client UUID: ', function() {

  describe('request', function() {
    genericValidationTest({ // the valid object
      seq: 12345,
      action: "client-uuid"
    }, [ // the valid permutations
      {seq: -1},
      {seq: 0},
    ], [ // the invalid permutations
      {seq: undefined},
      {seq: null},
      {seq: 1.5},
      {seq: "not an integer"},

      {action: undefined},
      {action: null},
      {action: true},
      {action: 3},
      {action: ""},
      {action: "not 'client-uuid'"}
    ], dialect.dialect['client-uuid'].request); //the validator
  });

  describe('success response', function() {
    genericValidationTest({
      seq: 12345,
      action: 'client-uuid',
      code: 200,
      uuid: uuid.v1()
    }, [
      {seq: -1},
      {seq: 0},
    ], [
      {seq: undefined},
      {seq: null},
      {seq: 1.5},
      {seq: "not an integer"},

      {action: "not 'client-uuid'"},
      {action: ''},
      {action: undefined},
      {action: null},

      {code: undefined},
      {code: null},
      {code: 100},

      {uuid: undefined},
      {uuid: null},
      {uuid: "string, but not a uuid"},
      {uuid: 12345678}
    ], dialect.dialect['client-uuid'][200]);
  });

});


describe('Subscribe: ', function() {

  describe('request', function() {
    genericValidationTest({ // the valid object
      seq: 12345,
      action: "subscribe",
      channel: "channel name"
    }, [ // the valid permutations
      {seq: -1},
      {seq: 0},
    ], [ // the invalid permutations
      {seq: undefined},
      {seq: null},
      {seq: 1.5},
      {seq: "not an integer"},

      {action: undefined},
      {action: null},
      {action: true},
      {action: 3},
      {action: ""},
      {action: "not 'subscribe'"},

      {channel: undefined},
      {channel: null},
      {channel: 3},
      {channel: ''}
    ], dialect.dialect.subscribe.request); //the validator
  });

  describe('success response', function() {
    genericValidationTest({
      seq: 12345,
      action: 'subscribe',
      code: 200,
      channels: [
        "a string",
        "another string",
        "a third string"
      ]
    }, [
      {seq: -1},
      {seq: 0},

      {channels: []},
      {channels: ['a']},
      {channels: ['a', 'b']},
      {channels: ['a', 'b', 'c']},
      {channels: ["0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"]} // 128
    ], [
      {action: "not 'subscribe'"},
      {action: ''},
      {action: undefined},
      {action: null},

      {seq: undefined},
      {seq: null},
      {seq: 1.5},
      {seq: "not an integer"},

      {code: undefined},
      {code: null},
      {code: 100},

      {channels: undefined},
      {channels: null},
      {channels: "not an array"},
      {channels: ["a", "b", 1]},
      {channels: [123, 1234, true]},
      {channels: [""]}, // 0
      {channels: ["0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0"]} // 129
    ], dialect.dialect.subscribe[200]);
  });

  validateIncorrectPermissions(
    "You do not have read permissions on this socket, and therefore cannot subscribe to channels.",
    'subscribe', dialect.dialect.subscribe[401]
  );

});

describe('Unsubscribe: ', function() {

  describe('request', function() {
    genericValidationTest({ //the valid object
      seq: 12345,
      action: "unsubscribe",
      channel: "channel name"
    }, [
      {seq: -1},
      {seq: 0},

      {channel: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"} // 128
    ], [ //the invalid permutations
      {seq: undefined},
      {seq: null},
      {seq: 1.5},
      {seq: "not an integer"},

      {action: undefined},
      {action: null},
      {action: true},
      {action: 3},
      {action: ""},
      {action: "not 'unsubscribe'"},

      {channel: undefined},
      {channel: null},
      {channel: 3},
      {channel: ''}, // 0
      {channel: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0"} // 129
    ], dialect.dialect.unsubscribe.request); //the validator
  });

  describe('successful unsubscribe response', function() {

    genericValidationTest({
      seq: 12345,
      action: 'unsubscribe',
      code: 200,
      channels: [
        "a string",
        "another string",
        "a third string"
      ]
    }, [
      {seq: -1},
      {seq: 0},

      {channels: []},
      {channels: ['a']},
      {channels: ['a', 'b']},
      {channels: ['a', 'b', 'c']},
      {channels: ["0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"]} // 128
    ], [ //the invalid permutations
      {seq: undefined},
      {seq: null},
      {seq: 1.5},
      {seq: "not an integer"},

      {action: "not 'unsubscribe'"},
      {action: ''},
      {action: undefined},
      {action: null},

      {code: undefined},
      {code: null},
      {code: 100},

      {channels: undefined},
      {channels: null},
      {channels: "not an array"},
      {channels: ["a", "b", 1]},
      {channels: [123, 1234, true]},
      {channels: [""]}, // 0
      {channels: ["0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0"]} // 129
    ], dialect.dialect.unsubscribe[200]);
  });

  describe('not found', function() {
    genericValidationTest({
      seq: 12345,
      action: 'unsubscribe',
      code: 401,
      message: 'Not Authorized',
      details: "You do not have read permissions."
    }, [
      {seq: -1},
      {seq: 0},

      {details: undefined},
      {details: ''},
      {details: 'any string'},
    ], [ //the invalid permutations
      {seq: undefined},
      {seq: null},
      {seq: 'not an integer'},
      {seq: 1.5},

      {action: "not 'unsubscribe'"},
      {action: ''},
      {action: undefined},
      {action: null},

      {code: undefined},
      {code: null},
      {code: 303},

      {message: ''},
      {message: true},
      {message: null},
      {message: undefined},

      {details: null},
      {details: 3}
    ], dialect.dialect.unsubscribe[401]);
  });

  describe('not found', function() {
    genericValidationTest({
      seq: 12345,
      action: 'unsubscribe',
      code: 404,
      message: 'Not Found',
      details: "You are not subscribed to the specified channel."
    }, [
      {seq: -1},
      {seq: 0},

      {details: undefined},
      {details: ''},
      {details: 'any string'},
    ], [ //the invalid permutations
      {seq: undefined},
      {seq: null},
      {seq: 'not an integer'},
      {seq: 1.5},

      {action: "not 'unsubscribe'"},
      {action: ''},
      {action: undefined},
      {action: null},

      {code: undefined},
      {code: null},
      {code: 303},

      {message: ''},
      {message: true},
      {message: null},
      {message: undefined},

      {details: null},
      {details: 3}
    ], dialect.dialect.unsubscribe[404]);
  });

  validateIncorrectPermissions(
    "You do not have read permissions on this socket, and therefore cannot subscribe/unsubscribe to/from channels.",
    'unsubscribe', dialect.dialect.unsubscribe[401]
  );

});

describe('Unsubscribe-All: ', function() {

  describe('request', function() {
    genericValidationTest({ //the valid object
      seq: 12345,
      action: "unsubscribe-all"
    }, [
      {seq: -1},
      {seq: 0},
    ], [ //the invalid permutations
      {seq: undefined},
      {seq: null},
      {seq: 1.5},
      {seq: "not an integer"},

      {action: undefined},
      {action: null},
      {action: true},
      {action: 3},
      {action: ""},
      {action: "not 'unsubscribe-all'"}
    ], dialect.dialect['unsubscribe-all'].request); //the validator
  });

  describe('successful unsubscribe-all response', function() {

    genericValidationTest({
      seq: 12345,
      action: 'unsubscribe-all',
      code: 200,
      channels: [
        "a string",
        "another string",
        "a third string"
      ]
    }, [
      {seq: -1},
      {seq: 0},

      {channels: []},
      {channels: ['a']},
      {channels: ['a', 'b']},
      {channels: ['a', 'b', 'c']},
      {channels: ["0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"]} // 128
    ], [ //the invalid permutations
      {seq: undefined},
      {seq: null},
      {seq: 1.5},
      {seq: "not an integer"},

      {action: "not 'unsubscribe-all'"},
      {action: ''},
      {action: undefined},
      {action: null},

      {code: undefined},
      {code: null},
      {code: 100},

      {channels: undefined},
      {channels: null},
      {channels: "not an array"},
      {channels: ["a", "b", 1]},
      {channels: [123, 1234, true]},
      {channels: [""]}, // 0
      {channels: ["0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0"]} // 129
    ], dialect.dialect['unsubscribe-all'][200]);
  });

  describe('not authorized', function() {
    genericValidationTest({
      seq: 12345,
      action: 'unsubscribe-all',
      code: 401,
      message: 'Not Authorized',
      details: "You do not have read permissions."
    }, [
      {seq: -1},
      {seq: 0},

      {details: undefined},
      {details: ''},
      {details: 'any string'},
    ], [ //the invalid permutations
      {seq: undefined},
      {seq: null},
      {seq: 'not an integer'},
      {seq: 1.5},

      {action: "not 'unsubscribe-all'"},
      {action: ''},
      {action: undefined},
      {action: null},

      {code: undefined},
      {code: null},
      {code: 303},

      {message: ''},
      {message: true},
      {message: null},
      {message: undefined},

      {details: null},
      {details: 3}
    ], dialect.dialect['unsubscribe-all'][401]);
  });

  describe('not found', function() {
    genericValidationTest({
      seq: 12345,
      action: 'unsubscribe-all',
      code: 404,
      message: 'Not Found',
      details: "You are not subscribed to the specified channel."
    }, [
      {seq: -1},
      {seq: 0},

      {details: undefined},
      {details: ''},
      {details: 'any string'},
    ], [ //the invalid permutations
      {seq: undefined},
      {seq: null},
      {seq: 'not an integer'},
      {seq: 1.5},

      {action: "not 'unsubscribe-all'"},
      {action: ''},
      {action: undefined},
      {action: null},

      {code: undefined},
      {code: null},
      {code: 303},

      {message: ''},
      {message: true},
      {message: null},
      {message: undefined},

      {details: null},
      {details: 3}
    ], dialect.dialect['unsubscribe-all'][404]);
  });

  validateIncorrectPermissions(
    "You do not have read permissions on this socket, and therefore cannot subscribe/unsubscribe to/from channels.",
    'unsubscribe', dialect.dialect.unsubscribe[401]
  );

});

describe('Subscriptions: ', function() {

  describe('request', function() {
    genericValidationTest({ //the valid object
      seq: 12345,
      action: "subscriptions"
    }, [
      {seq: -1},
      {seq: 0},
    ], [ //the invalid permutations
      {seq: undefined},
      {seq: null},
      {seq: 1.5},
      {seq: "not an integer"},

      {action: undefined},
      {action: null},
      {action: true},
      {action: 3},
      {action: ""},
      {action: "not 'subscriptions'"}
    ], dialect.dialect['subscriptions'].request); //the validator
  });

  describe('successful subscriptions response', function() {

    genericValidationTest({
      seq: 12345,
      action: 'subscriptions',
      code: 200,
      channels: [
        "a string",
        "another string",
        "a third string"
      ]
    }, [
      {seq: -1},
      {seq: 0},

      {channels: []},
      {channels: ['a']},
      {channels: ['a', 'b']},
      {channels: ['a', 'b', 'c']},
      {channels: ["0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"]} // 128
    ], [ //the invalid permutations
      {action: "not 'subscriptions'"},
      {action: ''},
      {action: undefined},
      {action: null},

      {seq: undefined},
      {seq: null},
      {seq: 1.5},
      {seq: "not an integer"},

      {code: undefined},
      {code: null},
      {code: 100},

      {channels: undefined},
      {channels: null},
      {channels: "not an array"},
      {channels: ["a", "b", 1]},
      {channels: [123, 1234, true]},
      {channels: [""]}, // 0
      {channels: ["0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0"]} // 129
    ], dialect.dialect['subscriptions'][200]);
  });

  describe('not authorized', function() {
    genericValidationTest({
      seq: 12345,
      action: 'subscriptions',
      code: 401,
      message: 'Not Authorized',
      details: "You do not have read permissions."
    }, [
      {seq: -1},
      {seq: 0},

      {details: undefined},
      {details: ''},
      {details: 'any string'},
    ], [ //the invalid permutations
      {seq: undefined},
      {seq: null},
      {seq: 'not an integer'},
      {seq: 1.5},

      {action: "not 'subscriptions'"},
      {action: ''},
      {action: undefined},
      {action: null},

      {code: undefined},
      {code: null},
      {code: 303},

      {message: ''},
      {message: true},
      {message: null},
      {message: undefined},

      {details: null},
      {details: 3}
    ], dialect.dialect['subscriptions'][401]);
  });

  validateIncorrectPermissions(
    "You do not have read permissions on this socket, and therefore cannot subscribe/unsubscribe to/from channels.",
    'unsubscribe', dialect.dialect.unsubscribe[401]
  );

});


describe('Publish ', function() {

  describe('request', function() {
    genericValidationTest({
      seq: 12345,
      action: 'pub',
      chan: 'any string',
      msg: 'any string'
    }, [
      {seq: -1},
      {seq: 0},

      {chan: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"}, // 128

      {msg: ""},
      {msg: "a"},
      {msg: "any message"}
    ], [ //the invalid permutations
      {seq: undefined},
      {seq: null},
      {seq: 1.5},
      {seq: "not an integer"},

      {action: undefined},
      {action: null},
      {action: true},
      {action: 3},
      {action: ""},
      {action: "not 'pub'"},

      {chan: undefined},
      {chan: null},
      {chan: 3},
      {chan: ''},

      {msg: undefined},
      {msg: null},
      {msg: 3}
    ], dialect.dialect.pub.request);
  });

  describe('no subscriptions response', function() {
    genericValidationTest({
      seq: 12345,
      action: 'pub',
      code: 404,
      message: 'Not Found',
      details: "There are no subscribers to the specified channel, so the message could not be delivered."
    }, [
      {seq: -1},
      {seq: 0},

      {message: "any message"},

      {details: ""},
      {details: "any message"}
    ], [ //the invalid permutations
      {action: "not 'pub'"},
      {action: ''},
      {action: undefined},
      {action: null},

      {seq: undefined},
      {seq: null},
      {seq: 'not an integer'},
      {seq: 1.5},

      {code: undefined},
      {code: null},
      {code: 303},

      {message: ''},
      {message: true},
      {message: null},
      {message: undefined},

      {details: 3}
    ], dialect.dialect.pub[404]);
  });

  validateIncorrectPermissions(
    "You do not have write permissions on this socket, and therefore cannot publish to channels.",
    'pub', dialect.dialect.pub[401]
  );
});

describe('Messages', function() {
  genericValidationTest({
    id: '1f854174-3e55-43fa-9d4a-a0af54c6fc49', //any uuid
    action: 'msg',
    time: '2016-12-05T11:02:25-07:00', //iso 8601 timestamp
    chan: 'any string',
    msg: 'any string'
  }, [
    {time: '2016-12-05T11:02:25Z'},

    {chan: '0'},
    {chan: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'}, // 128

    {msg: ''},
    {msg: 'a'},
    {msg: 'any value'}
  ], [ //the invalid permutations
    {id: undefined},
    {id: null},
    {id: 'not a uuid'},

    {action: "not 'msg'"},
    {action: ''},
    {action: undefined},
    {action: null},

    {time: undefined},
    {time: null},
    {time: 123456789},
    {time: 'not a timestamp'},

    {chan: undefined},
    {chan: null},
    {chan: 1},
    {chan: ""}, // 0
    {chan: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0'}, // 129

    {msg: 1},
    {msg: null},
    {msg: undefined}
  ], dialect.dialect.msg);

});

describe('validate function', function() {

  it('should pass a valid object', function() {
    const exampleObject = {
      seq: 12345,
      action: 'pub',
      code: 404,
      message: 'Not Found',
      details: 'There are no subscribers to the specified channel, so the message could not be delivered.'
    };

    //without callback
    const result = dialect.validate(exampleObject, dialect.dialect.pub[404]);
    expect(result.error).to.be.null;
    expect(result.value).to.be.deep.equal(exampleObject);

    //with callback
    dialect.validate(exampleObject, dialect.dialect.pub[404], function(err, value) {
      expect(err).to.be.null;
      expect(value).to.be.deep.equal(exampleObject);
    });

  });

  it('should fail an invalid object', function() {
    const exampleObject = {
      seq: 'not an integer',
      action: 'anything',
      code: 100,
      message: 'anything',
      details: 'anything'
    };

    //without callback
    const result = dialect.validate(exampleObject, dialect.dialect.pub[404]);
    expect(result.error).to.not.be.null;
    expect(result.value).to.be.deep.equal(exampleObject);

    //with callback
    dialect.validate(exampleObject, dialect.dialect.pub[404], function(err, value) {
      expect(err).to.not.be.null;
      expect(value).to.be.deep.equal(exampleObject);
    });
  });
});
