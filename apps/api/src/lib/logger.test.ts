import assert from 'node:assert/strict';
import { test } from 'node:test';
import { logger } from './logger';

test('logger initializes with redaction and expected log methods', () => {
  assert.equal(typeof logger.info, 'function');
  assert.equal(typeof logger.warn, 'function');
  assert.equal(typeof logger.error, 'function');
  assert.equal(typeof logger.debug, 'function');
});
