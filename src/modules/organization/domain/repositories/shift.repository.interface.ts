import { ShiftInstanceEntity } from '../entities/shift-instance.entity';
import { ShiftGenerationJobEntity } from '../entities/shift-generation-job.entity';
import { ShiftOverrideEntity } from '../entities/shift-override.entity';

export interface IShiftInstanceRepository {
  findById(organizationId: string, id: string): Promise<ShiftInstanceEntity | null>;
  findByMembershipAndDate(organizationId: string, membershipId: string, date: Date): Promise<ShiftInstanceEntity | null>;
  save(shift: ShiftInstanceEntity): Promise<void>;
  saveMany(shifts: ShiftInstanceEntity[]): Promise<void>;
}

export interface IShiftGenerationJobRepository {
  findById(organizationId: string, id: string): Promise<ShiftGenerationJobEntity | null>;
  save(job: ShiftGenerationJobEntity): Promise<void>;
}

export interface IShiftOverrideRepository {
  findById(id: string): Promise<ShiftOverrideEntity | null>;
  save(override: ShiftOverrideEntity): Promise<void>;
}
