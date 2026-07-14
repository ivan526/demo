const errors = require('./errors');
const response = require('./response');
const auth = require('./auth');
const utils = require('./utils');

module.exports = { ...errors, ...response, ...auth, ...utils };
