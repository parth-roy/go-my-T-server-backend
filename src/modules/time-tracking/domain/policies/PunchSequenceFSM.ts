import { DomainException } from '../exceptions/DomainException';

export enum PunchState {
  NONE = 'NONE',
  CHECKED_IN = 'CHECKED_IN',
  ON_BREAK = 'ON_BREAK',
  BREAK_ENDED = 'BREAK_ENDED',
  CHECKED_OUT = 'CHECKED_OUT'
}

export enum PunchType {
  CHECK_IN = 'CHECK_IN',
  BREAK_START = 'BREAK_START',
  BREAK_END = 'BREAK_END',
  CHECK_OUT = 'CHECK_OUT'
}

export class PunchSequenceFSM {
  private currentState: PunchState;

  constructor(initialState: PunchState = PunchState.NONE) {
    this.currentState = initialState;
  }

  public getState(): PunchState {
    return this.currentState;
  }

  public transition(punch: PunchType): PunchState {
    switch (this.currentState) {
      case PunchState.NONE:
        if (punch === PunchType.CHECK_IN) {
          this.currentState = PunchState.CHECKED_IN;
          return this.currentState;
        }
        break;

      case PunchState.CHECKED_IN:
      case PunchState.BREAK_ENDED:
        if (punch === PunchType.BREAK_START) {
          this.currentState = PunchState.ON_BREAK;
          return this.currentState;
        }
        if (punch === PunchType.CHECK_OUT) {
          this.currentState = PunchState.CHECKED_OUT;
          return this.currentState;
        }
        break;

      case PunchState.ON_BREAK:
        if (punch === PunchType.BREAK_END) {
          this.currentState = PunchState.BREAK_ENDED;
          return this.currentState;
        }
        break;

      case PunchState.CHECKED_OUT:
        // SPLIT SHIFT SUPPORT: Allow checking back in after checking out
        // The requirements specified unlimited sessions. Checking in after checkout means starting a new session.
        if (punch === PunchType.CHECK_IN) {
          this.currentState = PunchState.CHECKED_IN;
          return this.currentState;
        }
        // Otherwise, terminal until a new session starts
        throw new DomainException('ILLEGAL_TRANSITION', `Cannot perform ${punch} when already CHECKED_OUT`);
    }

    throw new DomainException(
      'ILLEGAL_TRANSITION',
      `Illegal transition: Cannot perform ${punch} from state ${this.currentState}`
    );
  }
}
