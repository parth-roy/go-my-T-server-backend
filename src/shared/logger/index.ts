import winston from 'winston';
import { env } from '@config/env';
import { CorrelationContext } from '@shared/context/correlation.context';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const attachCorrelation = winston.format((info) => {
  const currentOpId = (info as any).operationId || CorrelationContext.getOperationId();
  if (currentOpId) {
    (info as any).operationId = currentOpId;
  }
  return info;
});

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  attachCorrelation(),
  printf(({ level, message, timestamp, stack, operationId, ...meta }: any) => {
    const opPrefix = operationId ? `[op:${operationId}] ` : '';
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${opPrefix}${stack || message} ${metaStr}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  attachCorrelation(),
  json()
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
  exceptionHandlers: [new winston.transports.Console()],
  rejectionHandlers: [new winston.transports.Console()],
});