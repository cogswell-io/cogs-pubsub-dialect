/*jshint: expr: true*/
const Joi = require('joi');
const validators = require('../index');
const expect = require('chai').expect;
const _ = require('lodash');

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

function passWhenValid(object, validator) {
  const result = Joi.validate(object, validator);
  expect(result.error).to.be.null;
  expect(result.value).to.have.all.keys(Object.keys(object));
}

function validateIncorrectPermissions(errorMessage, validator) {
  describe('incorrect permissions response', function() {
    genericValidationTest({
      sequence: 12345,
      code: 401,
      message: 'Not Authorized',
      details: errorMessage
    }, [
    ], [
      {sequence: 'not an integer'},
      {code: 300}, // not 401
      {message: ''}, // zero-length string
      {details: 999} // not a a string
    ], validator);
  });
}

function genericValidationTest(valid, valids, invalids, validator) {
  it('should pass when valid', function() {
    passWhenValid(valid, validator);
  });

  tryMultipleValidValues(valid, valids, validator);

  tryMultipleInvalidValues(valid, invalids, validator);
}

describe('General Responses: ', function() {

  describe('catch-all error response', function() {
    const validResponse = {
      sequence: 12345,
      code: 500,
      message: 'Internal Error',
      details: 'any string'
    };

    const validValues = [
    ];

    const invalidValues = [
      {code: undefined},
      {code: null},
      {code: 300},

      {message: ''},
      {message: true},
      {message: null},
      {message: undefined},

      {sequence: undefined},
      {sequence: null},
      {sequence: 'not an integer'},
      {sequence: 1.5},

      {details: 3}
    ];

    const validator = validators.general.catchAllError;

    genericValidationTest(validResponse, validValues, invalidValues, validator);
  });

  describe('catch-all error response', function() {

    const validResponse = {
      sequence: 12345,
      code: 400,
      message: 'Invalid Format',
      details: 'any string'
    };

    const validValues = [
    ];

    const invalidValues = [
      {code: undefined},
      {code: null},
      {code: 300},

      {message: null},
      {message: undefined},
      {message: true},
      {message: ''},

      {sequence: null},
      {sequence: undefined},
      {sequence: 'not an integer'},
      {sequence: 1.5}, // not an integer

      {details: 3} // not a string
    ];

    const validator = validators.general.invalidFormatError;

    genericValidationTest(validResponse, validValues, invalidValues, validator);
  });
});

describe('Subscription: ', function() {

  describe('directive', function() {
    genericValidationTest({ // the valid object
      sequence: 12345,
      directive: "subscribe",
      channel: "channel name"
    }, [ // the valid permutations
      {sequence: -1},
      {sequence: 0},
    ], [ // the invalid permutations
      {sequence: undefined},
      {sequence: null},
      {sequence: 1.5},
      {sequence: "not an integer"},

      {directive: undefined},
      {directive: null},
      {directive: true},
      {directive: 3},
      {directive: ""},
      {directive: "not 'subscribe'"},

      {channel: undefined},
      {channel: null},
      {channel: 3},
      {channel: ''}
    ], validators.subscribe.directive); //the validator
  });

  describe('success response', function() {
    genericValidationTest({
      sequence: 12345,
      code: 200,
      channels: [
        "a string",
        "another string",
        "a third string"
      ]
    }, [
      {sequence: -1},
      {sequence: 0},

      {channels: []},
      {channels: ['a']},
      {channels: ['a', 'b']},
      {channels: ['a', 'b', 'c']},
      {channels: ["0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"]} // 128
    ], [
      {sequence: undefined},
      {sequence: null},
      {sequence: 1.5},
      {sequence: "not an integer"},

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
    ], validators.subscribe.success);
  });

  validateIncorrectPermissions(
    "You do not have read permissions on this socket, and therefore cannot subscribe to channels.",
    validators.subscribe.incorrectPermissionsError
  );

});

describe('Unsubscription: ', function() {

  describe('directive', function() {
    genericValidationTest({ //the valid object
      sequence: 12345,
      directive: "unsubscribe",
      channel: "channel name"
    }, [
      {sequence: -1},
      {sequence: 0},

      {channel: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"} // 128
    ], [ //the invalid permutations
      {sequence: undefined},
      {sequence: null},
      {sequence: 1.5},
      {sequence: "not an integer"},

      {directive: undefined},
      {directive: null},
      {directive: true},
      {directive: 3},
      {directive: ""},
      {directive: "not 'unsubscribe'"},

      {channel: undefined},
      {channel: null},
      {channel: 3},
      {channel: ''}, // 0
      {channel: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0"} // 129
    ], validators.unsubscribe.directive); //the validator
  });

  describe('successful unsubscribe response', function() {

    genericValidationTest({
      sequence: 12345,
      code: 200,
      channels: [
        "a string",
        "another string",
        "a third string"
      ]
    }, [
      {sequence: -1},
      {sequence: 0},

      {channels: []},
      {channels: ['a']},
      {channels: ['a', 'b']},
      {channels: ['a', 'b', 'c']},
      {channels: ["0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"]} // 128
    ], [ //the invalid permutations
      {sequence: undefined},
      {sequence: null},
      {sequence: 1.5},
      {sequence: "not an integer"},

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
    ], validators.unsubscribe.success);
  });

  describe('not found', function() {
    genericValidationTest({
      sequence: 12345,
      code: 404,
      message: 'Not Found',
      details: "You are not subscribed to the specified channel."
    }, [
      {sequence: -1},
      {sequence: 0},

      {details: undefined},
      {details: ''},
      {details: 'any string'},
    ], [ //the invalid permutations
      {sequence: undefined},
      {sequence: null},
      {sequence: 'not an integer'},
      {sequence: 1.5},

      {code: undefined},
      {code: null},
      {code: 303},

      {message: ''},
      {message: true},
      {message: null},
      {message: undefined},

      {details: null},
      {details: 3}
    ], validators.unsubscribe.notFoundError);
  });

  validateIncorrectPermissions(
    "You do not have read permissions on this socket, and therefore cannot subscribe/unsubscribe to/from channels.",
    validators.unsubscribe.incorrectPermissionsError
  );

});

describe('Publish ', function() {

  describe('directive', function() {
    genericValidationTest({
      sequence: 12345,
      directive: 'publish',
      channel: 'any string',
      message: 'any string'
    }, [
      {sequence: -1},
      {sequence: 0},

      {channel: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"}, // 128

      {message: ""},
      {message: "a"},
      {message: "any message"}
    ], [ //the invalid permutations
      {sequence: undefined},
      {sequence: null},
      {sequence: 1.5},
      {sequence: "not an integer"},

      {directive: undefined},
      {directive: null},
      {directive: true},
      {directive: 3},
      {directive: ""},
      {directive: "not 'publish'"},

      {channel: undefined},
      {channel: null},
      {channel: 3},
      {channel: ''},

      {message: undefined},
      {message: null},
      {message: 3}
    ], validators.publish.directive);
  });

  describe('no subscriptions response', function() {
    genericValidationTest({
      sequence: 12345,
      code: 404,
      message: 'Not Found',
      details: "There are no subscribers to the specified channel, so the message could not be delivered."
    }, [
      {sequence: -1},
      {sequence: 0},

      {message: "any message"},

      {details: ""},
      {details: "any message"}
    ], [ //the invalid permutations
      {sequence: undefined},
      {sequence: null},
      {sequence: 'not an integer'},
      {sequence: 1.5},

      {code: undefined},
      {code: null},
      {code: 303},

      {message: ''},
      {message: true},
      {message: null},
      {message: undefined},

      {details: 3}
    ], validators.publish.noSubscriptionsError);
  });

  validateIncorrectPermissions(
    "You do not have write permissions on this socket, and therefore cannot publish to channels.",
    validators.publish.incorrectPermissionsError
  );
});

describe('Messages', function() {
  genericValidationTest({
    id: '1f854174-3e55-43fa-9d4a-a0af54c6fc49', //any uuid
    received: '2016-12-05T11:02:25-07:00', //iso 8601 timestamp
    channel: 'any string',
    message: 'any string'
  }, [
    {received: '2016-12-05T11:02:25Z'},

    {channel: '0'},
    {channel: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'}, // 128

    {message: ''},
    {message: 'a'},
    {message: 'any value'}
  ], [ //the invalid permutations
    {id: undefined},
    {id: null},
    {id: 'not a uuid'},

    {received: undefined},
    {received: null},
    {received: 123456789},
    {received: 'not a timestamp'},

    {channel: undefined},
    {channel: null},
    {channel: 1},
    {channel: ""}, // 0
    {channel: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0'}, // 129

    {message: 1},
    {message: null},
    {message: undefined}
  ], validators.message);

});

describe('validate function', function() {

  it('should pass a valid object', function() {
    const exampleObject = {
      sequence: 12345,
      code: 404,
      message: 'Not Found',
      details: 'There are no subscribers to the specified channel, so the message could not be delivered.'
    };

    //without callback
    const result = validators.validate(exampleObject, validators.publish.noSubscriptionsError);
    expect(result.error).to.be.null;
    expect(result.value).to.be.deep.equal(exampleObject);

    //with callback
    validators.validate(exampleObject, validators.publish.noSubscriptionsError, function(err, value) {
      expect(err).to.be.null;
      expect(value).to.be.deep.equal(exampleObject);
    });

  });

  it('should fail an invalid object', function() {
    const exampleObject = {
      sequence: 'not an integer',
      code: 100,
      message: 'wrong',
      details: 'wrong'
    };

    //without callback
    const result = validators.validate(exampleObject, validators.publish.noSubscriptionsError);
    expect(result.error).to.not.be.null;
    expect(result.value).to.be.deep.equal(exampleObject);

    //with callback
    validators.validate(exampleObject, validators.publish.noSubscriptionsError, function(err, value) {
      expect(err).to.not.be.null;
      expect(value).to.be.deep.equal(exampleObject);
    });

  });
});
