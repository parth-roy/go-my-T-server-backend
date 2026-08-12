import { ProposeShiftSwap, ApproveShiftSwap } from '../../commands/scheduling/ShiftSwapCommands';

export class ShiftSwapApplicationService {
  public async handleProposeShiftSwap(cmd: ProposeShiftSwap): Promise<void> {}
  public async handleApproveShiftSwap(cmd: ApproveShiftSwap): Promise<void> {}
}
