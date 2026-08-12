export interface TransitionContext {
  organizationId: string;
  membershipId: string;
  previousCategory?: string;
  newCategory: string;
  effectiveFrom: Date;
}

export interface EvaluationContext {
  organizationId: string;
  membershipId: string;
  [key: string]: any;
}

export interface StrategyResult {
  success: boolean;
  data?: any;
  errors?: string[];
}

export interface IEmploymentStrategy {
  /**
   * Hook invoked during an employment transition (e.g., Gig -> FT)
   */
  onTransition?(context: TransitionContext): Promise<void>;

  /**
   * Evaluate the strategy rules configuration against the current context
   */
  evaluateRules(rulesConfig: any, context: EvaluationContext): StrategyResult | Promise<StrategyResult>;
}
