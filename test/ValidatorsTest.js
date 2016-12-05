/* jshint: expr: true */
const Joi = require('joi');
const validators = require('../index');
const expect = require('chai').expect;
const _ = require('lodash');

function changeValue(object, value, validator) {
  const newObject = Object.assign({}, object, value);

  const result = Joi.validate(newObject, validator);
  expect(result.error).to.not.be.null;
}

function tryMultipleInvalidValues(valid, invalidObjects, validator) {
  _.each(invalidObjects, function(invalidObject) {
    it(`should fail when ${Object.keys(invalidObject)[0]} is not ${invalidObject[Object.keys(invalidObject)[0]]}`, function() {
      changeValue(valid, invalidObject, validator);
    });
  });
}

function passWhenValid(object, validator) {
  const result = Joi.validate(object, validator);
  expect(result.error).to.be.null;
}

function failWhenMissingAny(valid, validator) {
  _.each(valid, function(value, key) {
    changeValue(valid, {[key]: undefined}, validator);
  });
}

function validateIncorrectPermissions(errorMessage, validator) {
  describe('incorrect permissions response', function() {
    genericValidationTest({
      sequence: 12345,
      code: 401,
      message: 'Not Authorized',
      details: errorMessage
    }, [
      {sequence: 'not an integer'},
      {code: 300}, //not 401
      {message: 'Not "Not Authorized"'},
      {details: 999} //not a a string
    ], validator);
  });
}

function genericValidationTest(valid, invalids, validator) {
  it('should pass when valid', function() {
    passWhenValid(valid, validator);
  });

  it('should fail when missing any value', function() {
    failWhenMissingAny(valid, validator);
  });

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

    const invalidValues = [
      {code: 300}, //not 500
      {message: 'Not Internal Error'},
      {sequence: 'not an integer'},
      {details: 3} // not a string
    ];

    const validator = validators.general.catchAllError;

    genericValidationTest(validResponse, invalidValues, validator);
  });

  describe('catch-all error response', function() {

    const validResponse = {
      sequence: 12345,
      code: 400,
      message: 'Invalid Format',
      details: 'any string'
    };

    const invalidValues = [
      {code: 300}, //not 500
      {message: 'Not Invalid Format'},
      {sequence: 'not an integer'},
      {details: 3} // not a string
    ];

    const validator = validators.general.invalidFormatError;

    genericValidationTest(validResponse, invalidValues, validator);
  });
});

describe('Subscription: ', function() {

  describe('directive', function() {
    genericValidationTest({ //the valid object
      sequence: 12345,
      directive: "subscribe",
      channel: "channel name"
    }, [ //the invalid permutations
      {sequence: "not an integer"},
      {directive: "not 'subscribe'"},
      {channel: 3} // not a string
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
      {sequence: "not an integer"},
      {code: 100}, //not 200
      {channels: "not an array"},
      {channels: [ //non-string array
        123,
        1234,
        true
      ]}
    ], validators.subscribe.success);
  });

  validateIncorrectPermissions(
    "You do not have read permissions on this socket, and therefore cannot subscribe to channels.",
    validators.subscribe.incorrectPermissions
  );

});

describe('Unsubscription: ', function() {

  describe('directive', function() {
    genericValidationTest({ //the valid object
      sequence: 12345,
      directive: "unsubscribe",
      channel: "channel name"
    }, [ //the invalid permutations
      {sequence: "not an integer"},
      {directive: "not 'unsubscribe'"},
      {channel: 3} // not a string
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
      {sequence: "not an integer"},
      {code: 100}, //not 200
      {channels: "not an array"},
      {channels: [ //non-string array
        123,
        1234,
        true
      ]}
    ], validators.unsubscribe.success);
  });

  validateIncorrectPermissions(
    "You do not have read permissions on this socket, and therefore cannot subscribe/unsubscribe to/from channels.",
    validators.unsubscribe.incorrectPermissions
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
      {sequence: 'not an integer'},
      {directive: 'not "publish"'},
      {message: 2}, //not a string
      {details: 2} //not a string
    ], validators.publish.directive);
  });

  describe('no subscriptions response', function() {
    genericValidationTest({
      sequence: 12345,
      code: 404,
      message: 'Not Found',
      details: "There are no subscribers to the specified channel, so the message could not be delivered."
    }, [
      {sequence: 'not an integer'},
      {code: 300}, //not 404
      {message: 'not "Not Found"'},
      {details: 'incorerct details message'}
    ], validators.publish.noSubscriptions);
  });

  validateIncorrectPermissions(
    "You do not have write permissions on this socket, and therefore cannot publish to channels.",
    validators.publish.incorrectPermissions
  );
});
