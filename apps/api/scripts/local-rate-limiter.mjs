import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const maximumBodyBytes = 4096;
const maximumEntries = 100_000;
const maximumWindowMs = 24 * 60 * 60 * 1000;

function authorized(expectedToken, authorization) {
  if (!authorization?.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(expectedToken);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function createLocalRateLimiter({ token, now = Date.now, maximumKeys = maximumEntries }) {
  if (typeof token !== 'string' || Buffer.byteLength(token) < 32) {
    throw new Error('A local rate limiter token of at least 32 bytes is required.');
  }
  const windows = new Map();

  return function handle(request) {
    if (request.method !== 'POST' || request.path !== '/v1/consume') {
      return { status: 404, body: { error: 'Not Found' } };
    }
    if (!authorized(token, request.authorization)) {
      return { status: 401, body: { error: 'Unauthorized' } };
    }

    let input;
    try {
      input = JSON.parse(request.body);
    } catch {
      return { status: 400, body: { error: 'Invalid request' } };
    }
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
      typeof input.key !== 'string' || !/^[a-f\d]{64}$/i.test(input.key) ||
      !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 1000 ||
      !Number.isInteger(input.windowMs) || input.windowMs < 1000 || input.windowMs > maximumWindowMs) {
      return { status: 400, body: { error: 'Invalid request' } };
    }

    const currentTime = now();
    for (const [key, window] of windows) {
      if (currentTime >= window.startedAt + window.windowMs) windows.delete(key);
    }
    let window = windows.get(input.key);
    if (!window || currentTime >= window.startedAt + window.windowMs) {
      if (windows.size >= maximumKeys) return { status: 503, body: { error: 'Rate limiter capacity unavailable' } };
      window = { startedAt: currentTime, windowMs: input.windowMs, count: 0 };
      windows.set(input.key, window);
    }
    window.count += 1;
    if (window.count <= input.limit) return { status: 200, body: { allowed: true } };
    return {
      status: 200,
      body: { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((window.startedAt + window.windowMs - currentTime) / 1000)) },
    };
  };
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maximumBodyBytes) return null;
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function startLocalRateLimiter({ token, port = 4010, host = '127.0.0.1' }) {
  const handle = createLocalRateLimiter({ token });
  const server = createServer(async (request, response) => {
    const body = request.method === 'POST' ? await readBody(request) : '';
    if (body === null) {
      response.writeHead(413, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'Request too large' }));
      return;
    }
    const result = handle({
      method: request.method ?? '',
      path: new URL(request.url ?? '/', 'http://127.0.0.1').pathname,
      authorization: request.headers.authorization,
      body,
    });
    response.writeHead(result.status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    response.end(JSON.stringify(result.body));
  });
  server.listen(port, host, () => {
    process.stdout.write(`Local development rate limiter listening on http://${host}:${port}/v1/consume\n`);
  });
  return server;
}

function runFromCommandLine() {
  if (process.env.NODE_ENV !== 'development') {
    process.stderr.write('Local rate limiter requires NODE_ENV=development.\n');
    process.exitCode = 1;
    return;
  }
  const token = process.env.AUTH_RATE_LIMIT_TOKEN;
  if (!token || Buffer.byteLength(token) < 32) {
    process.stderr.write('Set AUTH_RATE_LIMIT_TOKEN to a randomly generated secret of at least 32 bytes.\n');
    process.exitCode = 1;
    return;
  }
  const port = Number(process.env.LOCAL_RATE_LIMITER_PORT ?? 4010);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    process.stderr.write('LOCAL_RATE_LIMITER_PORT must be between 1024 and 65535.\n');
    process.exitCode = 1;
    return;
  }
  startLocalRateLimiter({ token, port });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href.toLowerCase() === import.meta.url.toLowerCase()) {
  runFromCommandLine();
}
