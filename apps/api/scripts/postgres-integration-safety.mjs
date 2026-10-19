export function assertConnectedIdentity(identity, config) {
  const major = Math.floor(Number(identity.server_version_num) / 10000);
  if (identity.database_name !== config.expectedName) throw new Error('Connected database name mismatch.');
  if (identity.database_user !== config.expectedUser) throw new Error('Connected database role mismatch.');
  if (major !== 18) throw new Error('Target PostgreSQL major version must be 18.');
  if (identity.transaction_read_only !== 'on') throw new Error('Initial inspection must be read-only.');
  return major;
}

export function assertApplicationTablesEmpty(tableNames, rowCounts) {
  if (JSON.stringify([...tableNames].sort()) !== JSON.stringify([...rowCounts.keys()].sort())) {
    throw new Error('Application table inventory does not match the inspected table set.');
  }
  for (const [table, count] of rowCounts) {
    if (BigInt(count) !== 0n) throw new Error(`Disposable target application table ${table} is not empty.`);
  }
}

export function safeErrorSummary(error) {
  const name = typeof error?.name === 'string' && /^[A-Za-z][A-Za-z0-9_$]{0,63}$/.test(error.name)
    ? error.name
    : 'Error';
  let message = typeof error?.message === 'string' ? error.message : 'No safe error message available.';
  message = message
    .replace(/(?:postgres(?:ql)?:\/\/)[^\s"'`<>]+/gi, '[database-url-redacted]')
    .replace(/\b(password|passwd|pwd|secret|token|api[_-]?key|connection[_-]?string)\s*[=:]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/\b[A-F0-9]{8}-[A-F0-9]{4}-[1-8][A-F0-9]{3}-[89AB][A-F0-9]{3}-[A-F0-9]{12}\b/gi, '[id]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, 320);
  if (!message.trim()) message = 'No safe error message available.';

  const code = typeof error?.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code)
    ? ` SQLSTATE=${error.code}`
    : '';
  const constraint = typeof error?.constraint_name === 'string' && /^[A-Za-z_][A-Za-z0-9_$]{0,62}$/.test(error.constraint_name)
    ? ` constraint=${error.constraint_name}`
    : '';
  return `${name}: ${message}${code}${constraint}`;
}

// postgres-js rolls the transaction back when the callback rejects. The private
// sentinel makes successful assertions roll back too; work errors are rethrown
// only after the driver has completed the rollback.
export async function runRollbackOnly(begin, work) {
  const rollbackSignal = Symbol('rollback-only transaction');
  let workError;
  let rolledBack = false;
  try {
    await begin(async (tx) => {
      try {
        await work(tx);
      } catch (error) {
        workError = error;
      } finally {
        throw rollbackSignal;
      }
    });
  } catch (error) {
    if (error === rollbackSignal) rolledBack = true;
    else throw new Error(`Rollback-only transaction failed: ${safeErrorSummary(error)}`);
  }
  if (!rolledBack) throw new Error('Transaction completed without the required rollback.');
  if (workError) throw workError;
}
