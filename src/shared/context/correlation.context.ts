/**
 * correlation.context.ts — AsyncLocalStorage Request & Job Correlation Context (Point 9)
 *
 * Propagates operation IDs, user contexts, and entity identifiers across asynchronous
 * execution boundaries (database transactions, background jobs, external callbacks).
 */

import { AsyncLocalStorage } from 'async_hooks';

export interface CorrelationData {
  operationId: string;
  userId?: string;
  role?: string;
  bookingId?: string;
  source?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<CorrelationData>();

export const CorrelationContext = {
  /**
   * Run an asynchronous function within a scoped correlation context.
   */
  run<R>(data: CorrelationData, fn: () => R): R {
    return asyncLocalStorage.run(data, fn);
  },

  /**
   * Retrieve the current correlation context if available.
   */
  get(): CorrelationData | undefined {
    return asyncLocalStorage.getStore();
  },

  /**
   * Get the current operation ID or return undefined if running outside a request context.
   */
  getOperationId(): string | undefined {
    return asyncLocalStorage.getStore()?.operationId;
  },

  /**
   * Mutate or augment the current context store with additional attributes.
   */
  set(data: Partial<CorrelationData>): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      Object.assign(store, data);
    }
  },
};
