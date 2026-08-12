import { SubmitLeaveCommand, AccrueLeaveCommand, CreditCompOffCommand } from '../commands/LeaveCommands';
import { LeaveRequest } from '../../domain/aggregates/LeaveRequest';
import { LeaveBalanceLedger } from '../../domain/aggregates/LeaveBalanceLedger';
import { CompOffLedger } from '../../domain/aggregates/CompOffLedger';
import { LeaveAvailabilityPolicy } from '../../domain/policies/LeaveAvailabilityPolicy';
import { LeaveSnapshot } from '../../domain/value-objects/LeaveSnapshot';
import { DomainException } from '../../domain/exceptions/DomainException';

export class LeaveApplicationService {
  
  // Dependencies injected in a real implementation
  // constructor(private leaveRepo: ILeaveRepository, private ledgerRepo: ILedgerRepository) {}

  public async submitLeave(command: SubmitLeaveCommand): Promise<string> {
    const policy = new LeaveAvailabilityPolicy();
    
    // In a real application, we would fetch existing leaves and conflicts
    const isValid = policy.validateAvailability(command.startDate, command.endDate, [], false, false);
    
    if (!isValid) {
      throw new DomainException('POLICY_VIOLATION', 'Leave overlaps with existing assignments or attendance.');
    }

    const snapshot = new LeaveSnapshot('v1', 'v1', 'v1', 'v1', 'v1');
    const request = new LeaveRequest(
      crypto.randomUUID(),
      command.workerId,
      command.leaveTypeId,
      command.startDate,
      command.endDate,
      snapshot
    );

    request.submit();
    
    // await this.leaveRepo.save(request);
    
    return request.leaveRequestId;
  }

  public async accrueLeave(command: AccrueLeaveCommand): Promise<void> {
    // const ledger = await this.ledgerRepo.getByWorkerAndType(command.workerId, command.leaveTypeId);
    const ledger = new LeaveBalanceLedger(crypto.randomUUID(), command.workerId, command.leaveTypeId, 0);
    ledger.accrue(command.amount);
    // await this.ledgerRepo.save(ledger);
  }

  public async creditCompOff(command: CreditCompOffCommand): Promise<void> {
    // const ledger = await this.compOffRepo.getByWorker(command.workerId);
    const ledger = new CompOffLedger(crypto.randomUUID(), command.workerId);
    ledger.credit(crypto.randomUUID(), command.amount, command.expiryDate);
    // await this.compOffRepo.save(ledger);
  }
}
