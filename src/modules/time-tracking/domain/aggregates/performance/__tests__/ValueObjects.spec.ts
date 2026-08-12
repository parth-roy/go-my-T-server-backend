import { describe, it, expect } from 'vitest';
import { OkrScore } from '../value-objects/OkrScore.vo';
import { EvaluationRating } from '../value-objects/EvaluationRating.vo';
import { KeyResultProgress } from '../value-objects/KeyResultProgress.vo';
import { AdherenceSnapshot } from '../value-objects/AdherenceSnapshot.vo';

describe('Performance Value Objects', () => {
  describe('OkrScore', () => {
    it('should create valid OkrScore', () => {
      const score = OkrScore.create(85);
      expect(score.value).toBe(85);
    });

    it('should throw on out of bounds', () => {
      expect(() => OkrScore.create(-1)).toThrow();
      expect(() => OkrScore.create(101)).toThrow();
    });
  });

  describe('EvaluationRating', () => {
    it('should create valid EvaluationRating', () => {
      const rating = EvaluationRating.create('MEETS_EXPECTATIONS');
      expect(rating.value).toBe('MEETS_EXPECTATIONS');
    });

    it('should throw on invalid rating', () => {
      expect(() => EvaluationRating.create('AVERAGE')).toThrow();
    });
  });

  describe('KeyResultProgress', () => {
    it('should create valid KeyResultProgress and calculate percentage', () => {
      const krp = KeyResultProgress.create(5, 10, 'deliveries');
      expect(krp.getPercentage()).toBe(50);
    });

    it('should throw if target is zero or less', () => {
      expect(() => KeyResultProgress.create(5, 0, 'units')).toThrow();
      expect(() => KeyResultProgress.create(5, -5, 'units')).toThrow();
    });

    it('should throw if current is negative', () => {
      expect(() => KeyResultProgress.create(-1, 10, 'units')).toThrow();
    });

    it('should cap percentage at 100', () => {
      const krp = KeyResultProgress.create(15, 10, 'deliveries');
      expect(krp.getPercentage()).toBe(100);
    });
  });

  describe('AdherenceSnapshot', () => {
    it('should create valid snapshot', () => {
      const start = new Date('2026-01-01');
      const end = new Date('2026-01-31');
      const snap = AdherenceSnapshot.create(95.5, '1.0', start, end, new Date(), 'CALCULATED');
      expect(snap.score).toBe(95.5);
      expect(snap.status).toBe('CALCULATED');
    });

    it('should throw if status is not CALCULATED', () => {
      const start = new Date('2026-01-01');
      const end = new Date('2026-01-31');
      expect(() => AdherenceSnapshot.create(95.5, '1.0', start, end, new Date(), 'PENDING')).toThrow();
    });

    it('should throw if dates are invalid', () => {
      const start = new Date('2026-01-31');
      const end = new Date('2026-01-01'); // start after end
      expect(() => AdherenceSnapshot.create(95.5, '1.0', start, end, new Date(), 'CALCULATED')).toThrow();
    });
  });
});
