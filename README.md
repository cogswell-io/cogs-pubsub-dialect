# Cogswell Pub-Sub Dialect

This package is a collection of JavaScript object validators to validate [cogswell](https://cogswell.io) pub-sub request/response objects. This package uses the Joi library for validation.

## Usage

```javascript
const validators = require('cogs-pubsub-dialect');

const exampleObject = {
  sequence: 12345,
  code: 404,
  message: 'Not Found',
  details: 'There are no subscribers to the specified channel, so the message could not be delivered.'
}

//without callback
const result = validators.validate(exampleObject, validators.publish.noSubscriptionsError);
result == {err: null, value: exampleObject}; //true

//with callback
const result = validators.validate(exampleObject, validators.publish.noSubscriptionsError, function(err, value) {
  err == null; //true
  value == exampleObject; //true 
});

//with Joi directly
const result = Joi.validate(exampleObject, validators.publish.noSubscriptionsError);
result == {err: null, value: exampleObject}; //true
//or
const result = Joi.validate(exampleObject, validators.publish.noSubscriptionsError, function(err, value) {
  err == null; //true
  value == exampleObject; //true 
});
```

## Validators

Use the following validators to validate their respective objects

- general
-- catchAllError
-- invalidFormatError
- subscribe
-- directive
-- success
-- incorrectPermissionsError
- unsubscribe
-- directive
-- success
-- incorrectPermissionsError
-- notFoundError
- publish
-- directive
-- incorrectPermissionsError
-- noSubscriptionsError
- message
