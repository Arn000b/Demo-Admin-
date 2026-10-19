import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTestDatabaseClient, readIntegrationTestConfig } from './integration-safety.mjs';

const validEnvironment = {
  // Reserved .invalid domain and port 1 make this fixture non-routable.
  TEST_DATABASE_URL: 'postgresql://test_user:test_password@disposable.invalid:1/neondb?sslmode=require',
  TEST_DATABASE_EXPECTED_HOST: 'disposable.invalid',
  TEST_DATABASE_EXPECTED_NAME: 'neondb',
  TEST_DATABASE_EXPECTED_USER: 'test_user',
  PERSISTENT_TEST_DATABASE_EXPECTED_HOST: 'persistent.neon.tech',
  PRODUCTION_DATABASE_EXPECTED_HOST: 'production.neon.tech',
};

const validNeonEnvironment = {
  ...validEnvironment,
  TEST_DATABASE_URL: 'postgresql://test_user:test_password@disposable.neon.tech:5432/neondb?sslmode=require',
  TEST_DATABASE_EXPECTED_HOST: 'disposable.neon.tech',
};

function assertRejectedBeforeConnect(environment, pattern) {
  let connectionFactoryCalls = 0;
  assert.throws(
    () => createTestDatabaseClient(environment, () => {
      connectionFactoryCalls += 1;
      return {};
    }),
    pattern,
  );
  assert.equal(connectionFactoryCalls, 0);
}

test('missing TEST_DATABASE_URL fails before a database client can be created', () => {
  const environment = { ...validEnvironment };
  delete environment.TEST_DATABASE_URL;
  assertRejectedBeforeConnect(environment, /TEST_DATABASE_URL/);
});

test('every expected endpoint identifier is required', () => {
  for (const name of [
    'TEST_DATABASE_EXPECTED_HOST',
    'TEST_DATABASE_EXPECTED_NAME',
    'TEST_DATABASE_EXPECTED_USER',
    'PERSISTENT_TEST_DATABASE_EXPECTED_HOST',
  ]) {
    const environment = { ...validEnvironment };
    delete environment[name];
    assertRejectedBeforeConnect(environment, new RegExp(name));
  }
});

test('host, database, and role must each match the URL identity', () => {
  const mismatches = [
    { TEST_DATABASE_EXPECTED_HOST: 'other.invalid' },
    { TEST_DATABASE_EXPECTED_NAME: 'otherdb' },
    { TEST_DATABASE_EXPECTED_USER: 'other_user' },
  ];
  for (const mismatch of mismatches) {
    assertRejectedBeforeConnect({ ...validEnvironment, ...mismatch }, /does not match/);
  }
});

test('a matching non-Neon endpoint is still rejected before client creation', () => {
  assertRejectedBeforeConnect(validEnvironment, /must identify a Neon PostgreSQL database/);
});

test('persistent test and production endpoint identifiers must be distinct from the disposable endpoint', () => {
  assert.throws(
    () => readIntegrationTestConfig({
      ...validNeonEnvironment,
      TEST_DATABASE_EXPECTED_HOST: 'persistent.neon.tech',
      TEST_DATABASE_URL: 'postgresql://test_user:test_password@persistent.neon.tech/neondb?sslmode=require',
    }),
    /must be distinct/,
  );
  assert.throws(
    () => readIntegrationTestConfig({
      ...validNeonEnvironment,
      TEST_DATABASE_EXPECTED_HOST: 'production.neon.tech',
      TEST_DATABASE_URL: 'postgresql://test_user:test_password@production.neon.tech/neondb?sslmode=require',
    }),
    /must be distinct/,
  );
  assert.throws(
    () => readIntegrationTestConfig({
      ...validNeonEnvironment,
      PERSISTENT_TEST_DATABASE_EXPECTED_HOST: 'production.neon.tech',
    }),
    /must be distinct/,
  );
});

test('an explicitly unconfigured production target is allowed without opening a connection', () => {
  for (const productionValue of [undefined, '']) {
    const environment = { ...validNeonEnvironment };
    if (productionValue === undefined) delete environment.PRODUCTION_DATABASE_EXPECTED_HOST;
    else environment.PRODUCTION_DATABASE_EXPECTED_HOST = productionValue;
    const config = readIntegrationTestConfig(environment);
    assert.equal(config.productionHost, null);
    assert.equal(config.expectedHost, 'disposable.neon.tech');
  }
});

test('a configured production target remains validated and must differ from test targets', () => {
  const config = readIntegrationTestConfig(validNeonEnvironment);
  assert.equal(config.productionHost, 'production.neon.tech');
  for (const productionHost of ['disposable.neon.tech', 'persistent.neon.tech', 'not-neon.invalid']) {
    assertRejectedBeforeConnect(
      { ...validNeonEnvironment, PRODUCTION_DATABASE_EXPECTED_HOST: productionHost },
      /distinct|exact Neon hostname/,
    );
  }
});
