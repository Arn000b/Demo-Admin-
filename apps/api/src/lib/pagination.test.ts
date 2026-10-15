import assert from 'node:assert/strict';
import { test } from 'node:test';
import { paginationSchema } from './pagination';

test('pagination accepts bounded pages and rejects excessive offsets', () => {
  assert.deepEqual(paginationSchema.parse({ page: '10000', pageSize: '100' }), {
    page: 10_000,
    pageSize: 100,
  });
  assert.equal(paginationSchema.safeParse({ page: '10001', pageSize: '100' }).success, false);
  assert.equal(paginationSchema.safeParse({ page: '1e100', pageSize: '100' }).success, false);
  assert.deepEqual(paginationSchema.parse({}), { page: 1, pageSize: 20 });
});
