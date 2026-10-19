import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertApplicationTablesEmpty,
  assertConnectedIdentity,
  runRollbackOnly,
  safeErrorSummary,
} from './postgres-integration-safety.mjs';

const config = { expectedName: 'neondb', expectedUser: 'test_role' };
const identity = {
  database_name: 'neondb',
  database_user: 'test_role',
  server_version_num: 180006,
  transaction_read_only: 'on',
};

test('connected target identity mismatches fail closed', () => {
  assert.throws(() => assertConnectedIdentity({ ...identity, database_name: 'otherdb' }, config), /database name mismatch/);
  assert.throws(() => assertConnectedIdentity({ ...identity, database_user: 'other_role' }, config), /database role mismatch/);
  assert.throws(() => assertConnectedIdentity({ ...identity, server_version_num: 170000 }, config), /version must be 18/);
  assert.throws(() => assertConnectedIdentity({ ...identity, transaction_read_only: 'off' }, config), /must be read-only/);
});

test('non-empty or unexpected application tables fail before fixture writes', () => {
  const expectedTables = ['users', 'stocks'];
  assert.doesNotThrow(() => assertApplicationTablesEmpty(expectedTables, new Map([['users', '0'], ['stocks', '0']])));
  assert.throws(() => assertApplicationTablesEmpty(expectedTables, new Map([['users', '0'], ['stocks', '1']])), /stocks is not empty/);
  assert.throws(() => assertApplicationTablesEmpty(expectedTables, new Map([['users', '0']])), /inventory does not match/);
});

test('rollback-only helper rolls back after success and after assertion errors', async () => {
  for (const failure of [undefined, new Error('assertion failed')]) {
    let rolledBack = false;
    const begin = async (callback) => {
      try {
        await callback({});
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    };
    if (failure) {
      await assert.rejects(runRollbackOnly(begin, async () => { throw failure; }), failure);
    } else {
      await runRollbackOnly(begin, async () => {});
    }
    assert.equal(rolledBack, true);
  }
});

test('error summaries retain safe PostgreSQL diagnostics and redact secrets and identifiers', () => {
  const summary = safeErrorSummary(Object.assign(new Error('trigger failed for 123e4567-e89b-42d3-a456-426614174000 user@example.invalid token=do-not-show postgres://user:pass@db.neon.tech/name?sslmode=require'), {
    code: 'P0001',
    constraint_name: 'order_reservation_stock_conflict',
  }));
  assert.match(summary, /^Error: /);
  assert.match(summary, /SQLSTATE=P0001/);
  assert.match(summary, /constraint=order_reservation_stock_conflict/);
  assert.doesNotMatch(summary, /do-not-show|user@example\.invalid|123e4567|user:pass|sslmode=require/);
  assert.match(summary, /\[database-url-redacted\]/);
});

