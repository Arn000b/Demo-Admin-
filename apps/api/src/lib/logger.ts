import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const sensitiveKeys = [
  'password',
  '*.password',
  'token',
  '*.token',
  'tokenHash',
  '*.tokenHash',
  'authorization',
  '*.authorization',
  'cookie',
  '*.cookie',
  'secret',
  '*.secret',
  'apiKey',
  '*.apiKey',
  'appKey',
  '*.appKey',
  'appSecret',
  '*.appSecret',
  'encryptionKey',
  '*.encryptionKey',
];

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isTest ? 'silent' : isProduction ? 'info' : 'debug'),
  redact: {
    paths: sensitiveKeys,
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    !isProduction && !isTest
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export type Logger = typeof logger;
