import { EvaluationRating, EvaluationRatingValue } from '../value-objects/EvaluationRating.vo';

export class ManagerEvaluation {
  public id: string;
  public managerId: string;
  public rating: EvaluationRatingValue;
  public feedbackEncrypted: string | null;

  constructor(id: string, managerId: string, rating: string, feedbackEncrypted: string | null = null) {
    this.id = id;
    this.managerId = managerId;
    // Validate through Value Object
    const ratingVo = EvaluationRating.create(rating);
    this.rating = ratingVo.value;
    this.feedbackEncrypted = feedbackEncrypted;
  }
}
