import assert from 'node:assert/strict';
import { test } from 'node:test';
import { provisionAdminAccount, readLocalAdminTarget, type AdminProvisionStore } from './admin-provisioning';

const env = (overrides: Record<string, string | undefined> = {}) => ({
  NODE_ENV: 'development',
  ADMIN_PROVISION_DATABASE_URL: 'postgresql://localadmin:localpass@localhost:5432/anonna_mart_dev',
  ADMIN_PROVISION_EXPECTED_HOST: 'localhost',
  ADMIN_PROVISION_EXPECTED_NAME: 'anonna_mart_dev',
  ADMIN_PROVISION_EXPECTED_USER: 'localadmin',
  ADMIN_PROVISION_EXPECTED_PG_MAJOR: '18',
  ...overrides,
});

test('requires its dedicated URL and never falls back to DATABASE_URL', () => {
  assert.throws(() => readLocalAdminTarget(env({ ADMIN_PROVISION_DATABASE_URL: undefined, DATABASE_URL: 'postgresql://x:y@localhost/db' })), /ADMIN_PROVISION_DATABASE_URL/);
  assert.throws(() => readLocalAdminTarget(env({ ADMIN_PROVISION_DATABASE_URL: undefined, TEST_DATABASE_URL: 'postgresql://x:y@localhost/db' })), /ADMIN_PROVISION_DATABASE_URL/);
});

test('rejects non-development mode, non-loopback hosts, and mismatched identities', () => {
  assert.throws(() => readLocalAdminTarget(env({ NODE_ENV: 'production' })), /NODE_ENV=development/);
  assert.throws(() => readLocalAdminTarget(env({ ADMIN_PROVISION_DATABASE_URL: 'postgresql://u:p@db.example/db' })), /loopback/);
  assert.throws(() => readLocalAdminTarget(env({ ADMIN_PROVISION_EXPECTED_NAME: 'other' })), /does not match/);
  assert.throws(() => readLocalAdminTarget(env({ ADMIN_PROVISION_EXPECTED_USER: 'other' })), /does not match/);
  assert.throws(() => readLocalAdminTarget(env({ ADMIN_PROVISION_EXPECTED_HOST: '127.0.0.1' })), /does not match/);
});

test('rejects a configured production or persistent-test host conflict', () => {
  assert.throws(() => readLocalAdminTarget(env({ PRODUCTION_DATABASE_EXPECTED_HOST: 'localhost' })), /PRODUCTION_DATABASE_EXPECTED_HOST/);
  assert.throws(() => readLocalAdminTarget(env({ PERSISTENT_TEST_DATABASE_EXPECTED_HOST: 'localhost' })), /PERSISTENT_TEST_DATABASE_EXPECTED_HOST/);
});

function fakeStore(initial?: { id: string; email: string; role: string; status: string; hash?: string; salt?: string }) {
  let user = initial ? { ...initial } : undefined;
  let committed = 0;
  const store: AdminProvisionStore = {
    transaction: async (work) => {
      const before = user && { ...user };
      try {
        const result = await work({
          insertAdminIfAbsent: async (email) => {
            if (user?.email === email) return false;
            user = { id: 'new-user', email, role: 'admin', status: 'active' };
            return true;
          },
          findUserForUpdate: async (email) => user?.email === email ? { id: user.id, role: user.role } : undefined,
          activateAdmin: async (id) => { if (user?.id === id) user.status = 'active'; },
          upsertCredential: async (id, hash, salt) => { if (user?.id === id) Object.assign(user, { hash, salt }); },
        });
        committed += 1;
        return result;
      } catch (error) {
        user = before;
        throw error;
      }
    },
  };
  return { store, state: () => user && { ...user }, commits: () => committed };
}

const deterministicHash = async (password: string) => ({ hash: `hash:${password}`, salt: 'test-salt' });

test('creates an active admin with a hashed credential and is idempotent for admins', async () => {
  const fake = fakeStore();
  const first = await provisionAdminAccount(fake.store, ' Admin@Example.Test ', 'a-long-enough-password', deterministicHash);
  assert.deepEqual(first, { created: true });
  assert.equal(fake.state()?.role, 'admin');
  assert.equal(fake.state()?.status, 'active');
  assert.equal(fake.state()?.email, 'admin@example.test');
  assert.equal(fake.state()?.hash, 'hash:a-long-enough-password');

  const second = await provisionAdminAccount(fake.store, 'admin@example.test', 'another-long-password', deterministicHash);
  assert.deepEqual(second, { created: false });
  assert.equal(fake.state()?.hash, 'hash:another-long-password');
  assert.equal(fake.commits(), 2);
});

test('reactivates an existing admin while replacing its credential', async () => {
  const fake = fakeStore({ id: 'admin-1', email: 'admin@example.test', role: 'admin', status: 'inactive', hash: 'old-hash' });
  const result = await provisionAdminAccount(fake.store, 'admin@example.test', 'a-new-long-password', deterministicHash);
  assert.deepEqual(result, { created: false });
  assert.equal(fake.state()?.status, 'active');
  assert.equal(fake.state()?.hash, 'hash:a-new-long-password');
});

test('refuses to promote an existing non-admin and rolls back the transaction', async () => {
  const fake = fakeStore({ id: 'customer-1', email: 'person@example.test', role: 'customer', status: 'active' });
  await assert.rejects(provisionAdminAccount(fake.store, 'person@example.test', 'a-long-enough-password', deterministicHash), /cannot be promoted/);
  assert.equal(fake.state()?.role, 'customer');
  assert.equal(fake.state()?.hash, undefined);
  assert.equal(fake.commits(), 0);
});

test('validates password length before a transaction can begin', async () => {
  const fake = fakeStore();
  await assert.rejects(provisionAdminAccount(fake.store, 'admin@example.test', 'short', deterministicHash), /12 to 128/);
  assert.equal(fake.commits(), 0);
});
