export enum SagaState {
  STARTED = 'STARTED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface SagaContext {
  sagaId: string;
  correlationId: string;
  causationId: string;
  state: SagaState;
  step: number;
  data: any;
  retryCount: number;
  nextExecutionAt?: Date;
}

export interface SagaRepository {
  findById(sagaId: string): Promise<SagaContext | null>;
  save(context: SagaContext, tx?: any): Promise<void>;
  beginTransaction(): Promise<any>;
  commitTransaction(tx: any): Promise<void>;
  rollbackTransaction(tx: any): Promise<void>;
}

export interface MessageBus {
  publish(event: any, tx?: any): Promise<void>;
  send(command: any, tx?: any): Promise<void>;
}

export abstract class BaseSaga {
  constructor(
    protected repository: SagaRepository,
    protected bus: MessageBus
  ) {}

  protected async loadOrCreateContext(sagaId: string, correlationId: string, causationId: string): Promise<SagaContext> {
    const existing = await this.repository.findById(sagaId);
    if (existing) {
      return existing;
    }

    return {
      sagaId,
      correlationId,
      causationId,
      state: SagaState.STARTED,
      step: 0,
      data: {},
      retryCount: 0
    };
  }

  protected async executeStep(
    context: SagaContext,
    action: (ctx: SagaContext, tx: any) => Promise<void>,
    compensation?: (ctx: SagaContext, tx: any) => Promise<void>
  ): Promise<void> {
    const tx = await this.repository.beginTransaction();
    try {
      if (context.state === SagaState.COMPENSATING && compensation) {
        await compensation(context, tx);
        context.step--;
        if (context.step < 0) {
          context.state = SagaState.COMPENSATED;
        }
      } else if (context.state === SagaState.STARTED) {
        await action(context, tx);
        context.step++;
        context.retryCount = 0; // Reset retries on success
      }
      
      await this.repository.save(context, tx);
      await this.repository.commitTransaction(tx);
    } catch (error) {
      await this.repository.rollbackTransaction(tx);
      await this.handleFailure(context, error);
    }
  }

  private async handleFailure(context: SagaContext, error: any): Promise<void> {
    context.retryCount++;
    const maxRetries = 3;
    
    if (context.retryCount > maxRetries) {
      context.state = context.state === SagaState.STARTED ? SagaState.COMPENSATING : SagaState.FAILED;
      context.retryCount = 0;
      context.nextExecutionAt = new Date(); // Immediate compensation scheduling
    } else {
      // Exponential backoff
      const backoffMs = Math.pow(2, context.retryCount) * 1000;
      context.nextExecutionAt = new Date(Date.now() + backoffMs);
    }

    await this.repository.save(context);
    
    if (context.state === SagaState.FAILED) {
      await this.routeToDLQ(context, error);
    }
  }

  protected async routeToDLQ(context: SagaContext, error: any): Promise<void> {
    // Abstract DLQ routing
  }
}
