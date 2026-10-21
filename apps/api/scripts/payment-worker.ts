import { runPaymentWorkerOnce } from '../src/features/payments/payment.worker';

const pollInterval = Number(process.env.PAYMENT_WORKER_INTERVAL_MS ?? 5000);
if (!Number.isInteger(pollInterval) || pollInterval < 1000 || pollInterval > 60_000) {
  throw new Error('PAYMENT_WORKER_INTERVAL_MS must be an integer from 1000 to 60000');
}

let stopping = false;
process.once('SIGINT', () => {
  stopping = true;
});
process.once('SIGTERM', () => {
  stopping = true;
});

console.log(
  JSON.stringify({
    level: 'info',
    event: 'background_worker.started',
    pollIntervalMs: pollInterval,
  })
);
while (!stopping) {
  try {
    await runPaymentWorkerOnce();
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'background_worker.cycle_failed',
        errorType: error instanceof Error ? error.name : 'UnknownError',
        retryInMs: pollInterval,
      })
    );
  }
  if (!stopping) await new Promise((resolve) => setTimeout(resolve, pollInterval));
}
console.log(JSON.stringify({ level: 'info', event: 'background_worker.stopped' }));
