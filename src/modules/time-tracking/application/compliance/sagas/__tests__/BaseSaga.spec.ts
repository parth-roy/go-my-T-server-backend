import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseSaga, SagaContext, SagaState, SagaRepository, MessageBus } from '../BaseSaga';

class TestSaga extends BaseSaga {
  public async doAction(ctx: SagaContext) {
    await this.executeStep(
      ctx,
      async (c, tx) => {
        if (c.data.fail) throw new Error('Action failed');
      },
      async (c, tx) => {
        if (c.data.failCompensate) throw new Error('Compensate failed');
      }
    );
  }
}

describe('BaseSaga', () => {
  let repository: any;
  let bus: any;
  let saga: TestSaga;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      save: vi.fn(),
      beginTransaction: vi.fn().mockResolvedValue('tx-1'),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn()
    };
    bus = { publish: vi.fn(), send: vi.fn() };
    saga = new TestSaga(repository, bus);
  });

  it('should handle compensating to compensated state', async () => {
    const ctx: SagaContext = {
      sagaId: 's-1',
      correlationId: 'c-1',
      causationId: 'c-2',
      state: SagaState.COMPENSATING,
      step: 0,
      data: {},
      retryCount: 0
    };
    
    await saga.doAction(ctx);
    expect(ctx.state).toBe(SagaState.COMPENSATED);
    expect(ctx.step).toBe(-1);
    expect(repository.save).toHaveBeenCalled();
  });

  it('should retry action and use exponential backoff', async () => {
    const ctx: SagaContext = {
      sagaId: 's-1',
      correlationId: 'c-1',
      causationId: 'c-2',
      state: SagaState.STARTED,
      step: 0,
      data: { fail: true },
      retryCount: 0
    };
    
    await saga.doAction(ctx);
    expect(ctx.retryCount).toBe(1);
    expect(ctx.nextExecutionAt).toBeDefined(); // Backoff
    expect(repository.save).toHaveBeenCalled();
  });

  it('should transition to FAILED and route to DLQ if max retries exceeded during compensation', async () => {
    const ctx: SagaContext = {
      sagaId: 's-1',
      correlationId: 'c-1',
      causationId: 'c-2',
      state: SagaState.COMPENSATING,
      step: 0,
      data: { failCompensate: true },
      retryCount: 3 // next fail will push > 3
    };
    
    // Spy on DLQ routing (abstract method default)
    const routeSpy = vi.spyOn(saga as any, 'routeToDLQ');
    
    await saga.doAction(ctx);
    expect(ctx.retryCount).toBe(0); // Resets after max retries
    expect(ctx.state).toBe(SagaState.FAILED);
    expect(routeSpy).toHaveBeenCalled();
  });
});
