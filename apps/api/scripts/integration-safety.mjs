const requiredVariables = [
  'TEST_DATABASE_URL',
  'TEST_DATABASE_EXPECTED_HOST',
  'TEST_DATABASE_EXPECTED_NAME',
  'TEST_DATABASE_EXPECTED_USER',
  'PERSISTENT_TEST_DATABASE_EXPECTED_HOST',
];

function requiredValue(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Required integration-test setting is missing: ${name}`);
  return value;
}

function normalizeHost(host) {
  return host.trim().toLowerCase().replace(/\.$/, '');
}

export function readIntegrationTestConfig(env) {
  const values = Object.fromEntries(requiredVariables.map((name) => [name, requiredValue(env, name)]));
  const productionHostValue = env.PRODUCTION_DATABASE_EXPECTED_HOST?.trim();
  let target;
  try {
    target = new URL(values.TEST_DATABASE_URL);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL.');
  }

  if (!['postgres:', 'postgresql:'].includes(target.protocol)) {
    throw new Error('TEST_DATABASE_URL must use the PostgreSQL protocol.');
  }

  const actualHost = normalizeHost(target.hostname);
  const expectedHost = normalizeHost(values.TEST_DATABASE_EXPECTED_HOST);
  const persistentHost = normalizeHost(values.PERSISTENT_TEST_DATABASE_EXPECTED_HOST);
  const productionHost = productionHostValue ? normalizeHost(productionHostValue) : null;
  let actualName;
  let actualUser;
  try {
    actualName = decodeURIComponent(target.pathname.replace(/^\//, ''));
    actualUser = decodeURIComponent(target.username);
  } catch {
    throw new Error('TEST_DATABASE_URL contains invalid encoded identity fields.');
  }

  if (actualHost !== expectedHost || actualName !== values.TEST_DATABASE_EXPECTED_NAME || actualUser !== values.TEST_DATABASE_EXPECTED_USER) {
    throw new Error('TEST_DATABASE_URL does not match the independently configured disposable target identity.');
  }
  if (actualHost === persistentHost || expectedHost === persistentHost ||
    (productionHost && [actualHost, expectedHost, persistentHost].includes(productionHost))) {
    throw new Error('Disposable, persistent-test, and production host identifiers must be distinct.');
  }
  if (!actualHost || !actualName || !actualUser || !actualHost.endsWith('.neon.tech') || (target.port && target.port !== '5432')) {
    throw new Error('TEST_DATABASE_URL must identify a Neon PostgreSQL database.');
  }
  if (!persistentHost.endsWith('.neon.tech')) {
    throw new Error('Persistent-test safeguards must be an exact Neon hostname.');
  }
  if (productionHost && !productionHost.endsWith('.neon.tech')) {
    throw new Error('A configured production safeguard must be an exact Neon hostname.');
  }

  return {
    url: values.TEST_DATABASE_URL,
    expectedHost,
    expectedName: values.TEST_DATABASE_EXPECTED_NAME,
    expectedUser: values.TEST_DATABASE_EXPECTED_USER,
    persistentHost,
    productionHost,
  };
}

export function createTestDatabaseClient(env, connect) {
  const config = readIntegrationTestConfig(env);
  return { config, client: connect(config.url) };
}
