import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { PunchSequenceFSM, PunchState, PunchType } from '../PunchSequenceFSM';
import { DomainException } from '../../exceptions/DomainException';

describe('PunchSequenceFSM', () => {
  it('should initialize with NONE state', () => {
    const fsm = new PunchSequenceFSM();
    assert.strictEqual(fsm.getState(), PunchState.NONE);
  });

  it('should allow CHECK_IN from NONE', () => {
    const fsm = new PunchSequenceFSM();
    fsm.transition(PunchType.CHECK_IN);
    assert.strictEqual(fsm.getState(), PunchState.CHECKED_IN);
  });

  it('should reject BREAK_START from NONE', () => {
    const fsm = new PunchSequenceFSM();
    assert.throws(() => fsm.transition(PunchType.BREAK_START), DomainException);
  });

  it('should allow BREAK_START and CHECK_OUT from CHECKED_IN', () => {
    let fsm = new PunchSequenceFSM(PunchState.CHECKED_IN);
    fsm.transition(PunchType.BREAK_START);
    assert.strictEqual(fsm.getState(), PunchState.ON_BREAK);

    fsm = new PunchSequenceFSM(PunchState.CHECKED_IN);
    fsm.transition(PunchType.CHECK_OUT);
    assert.strictEqual(fsm.getState(), PunchState.CHECKED_OUT);
  });

  it('should allow BREAK_END from ON_BREAK', () => {
    const fsm = new PunchSequenceFSM(PunchState.ON_BREAK);
    fsm.transition(PunchType.BREAK_END);
    assert.strictEqual(fsm.getState(), PunchState.BREAK_ENDED);
  });

  it('should reject CHECK_OUT from ON_BREAK directly', () => {
    const fsm = new PunchSequenceFSM(PunchState.ON_BREAK);
    assert.throws(() => fsm.transition(PunchType.CHECK_OUT), DomainException);
  });

  it('should allow BREAK_START and CHECK_OUT from BREAK_ENDED', () => {
    let fsm = new PunchSequenceFSM(PunchState.BREAK_ENDED);
    fsm.transition(PunchType.BREAK_START);
    assert.strictEqual(fsm.getState(), PunchState.ON_BREAK);

    fsm = new PunchSequenceFSM(PunchState.BREAK_ENDED);
    fsm.transition(PunchType.CHECK_OUT);
    assert.strictEqual(fsm.getState(), PunchState.CHECKED_OUT);
  });

  it('should support unlimited split shift sessions (CHECK_IN after CHECK_OUT)', () => {
    const fsm = new PunchSequenceFSM(PunchState.CHECKED_OUT);
    fsm.transition(PunchType.CHECK_IN);
    assert.strictEqual(fsm.getState(), PunchState.CHECKED_IN);
  });

  it('should reject duplicate transitions (e.g. CHECK_IN from CHECKED_IN)', () => {
    const fsm = new PunchSequenceFSM(PunchState.CHECKED_IN);
    assert.throws(() => fsm.transition(PunchType.CHECK_IN), DomainException);
  });
});
