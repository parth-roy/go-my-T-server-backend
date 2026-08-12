export interface ReliabilityScoringStrategy {
  calculateScore(events: any[]): number;
}
