export type LocalProvisionEnvironment = Record<string, string | undefined>;

export interface LocalAdminTarget {
  url: string;
  host: string;
  database: string;
  role: string;
  postgresMajor: number;
}

const required = (env: LocalProvisionEnvironment, name: string): string => {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Required local admin provisioning setting is missing: ${name}`);
  return value;
};

const normalizedHost = (host: string) => host.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');

export function readLocalAdminTarget(env: LocalProvisionEnvironment): LocalAdminTarget {
  if (env.NODE_ENV !== 'development') throw new Error('Local admin provisioning requires NODE_ENV=development.');
  const urlValue = required(env, 'ADMIN_PROVISION_DATABASE_URL');
  const expectedHost = normalizedHost(required(env, 'ADMIN_PROVISION_EXPECTED_HOST'));
  const expectedDatabase = required(env, 'ADMIN_PROVISION_EXPECTED_NAME');
  const expectedRole = required(env, 'ADMIN_PROVISION_EXPECTED_USER');
  const postgresMajor = Number(required(env, 'ADMIN_PROVISION_EXPECTED_PG_MAJOR'));
  if (!Number.isInteger(postgresMajor) || postgresMajor < 14 || postgresMajor > 99) {
    throw new Error('ADMIN_PROVISION_EXPECTED_PG_MAJOR must be a valid PostgreSQL major version.');
  }

  let target: URL;
  try {
    target = new URL(urlValue);
  } catch {
    throw new Error('ADMIN_PROVISION_DATABASE_URL must be a valid PostgreSQL URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(target.protocol) || target.search || target.hash) {
    throw new Error('ADMIN_PROVISION_DATABASE_URL must be a PostgreSQL URL without query or fragment options.');
  }
  const host = normalizedHost(target.hostname);
  const database = decodeURIComponent(target.pathname.replace(/^\//, ''));
  const role = decodeURIComponent(target.username);
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error('Local admin provisioning only permits a loopback database host.');
  }
  if (host !== expectedHost || database !== expectedDatabase || role !== expectedRole) {
    throw new Error('The supplied local database URL does not match the independently configured target identity.');
  }
  for (const name of ['PRODUCTION_DATABASE_EXPECTED_HOST', 'PERSISTENT_TEST_DATABASE_EXPECTED_HOST']) {
    const protectedHost = env[name]?.trim();
    if (protectedHost && normalizedHost(protectedHost) === host) {
      throw new Error(`The local provisioning target conflicts with ${name}.`);
    }
  }
  return { url: urlValue, host, database, role, postgresMajor };
}

export interface AdminProvisionTransaction {
  insertAdminIfAbsent(email: string): Promise<boolean>;
  findUserForUpdate(email: string): Promise<{ id: string; role: string } | undefined>;
  activateAdmin(userId: string): Promise<void>;
  upsertCredential(userId: string, passwordHash: string, salt: string): Promise<void>;
}

export interface AdminProvisionStore {
  transaction<T>(work: (tx: AdminProvisionTransaction) => Promise<T>): Promise<T>;
}

export async function provisionAdminAccount(
  store: AdminProvisionStore,
  emailInput: string,
  password: string,
  hashPassword: (value: string) => Promise<{ hash: string; salt: string }>,
): Promise<{ created: boolean }> {
  const email = emailInput.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    throw new Error('A valid admin email address is required.');
  }
  if (password.length < 12 || password.length > 128) {
    throw new Error('Admin passwords must contain 12 to 128 characters.');
  }
  const passwordCredential = await hashPassword(password);
  return store.transaction(async (tx) => {
    const created = await tx.insertAdminIfAbsent(email);
    const user = await tx.findUserForUpdate(email);
    if (!user) throw new Error('Admin account could not be created or found.');
    if (user.role !== 'admin') throw new Error('An existing non-admin account cannot be promoted by this command.');
    await tx.activateAdmin(user.id);
    await tx.upsertCredential(user.id, passwordCredential.hash, passwordCredential.salt);
    return { created };
  });
}
