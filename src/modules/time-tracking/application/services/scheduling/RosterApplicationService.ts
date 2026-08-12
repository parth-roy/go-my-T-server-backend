import { DraftRoster, InitiatePublishPipeline, RunAutoScheduler } from '../../commands/scheduling/RosterCommands';

export class RosterApplicationService {
  public async handleDraftRoster(cmd: DraftRoster): Promise<void> {}
  public async handleRunAutoScheduler(cmd: RunAutoScheduler): Promise<void> {}
  public async handleInitiatePublishPipeline(cmd: InitiatePublishPipeline): Promise<void> {}
}
