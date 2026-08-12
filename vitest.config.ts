import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/modules/time-tracking/application/compliance/**/*.ts',
        'src/modules/time-tracking/domain/aggregates/compliance/**/*.ts',
        'src/modules/time-tracking/presentation/compliance/**/*.ts'
      ],
      exclude: ['**/*.spec.ts', '**/*.test.ts', '**/index.ts', '**/models/**', '**/dtos/**'],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90
      }
    },
    include: [
      'src/modules/time-tracking/application/compliance/__tests__/**/*.spec.ts',
      'src/modules/time-tracking/application/compliance/cqrs/__tests__/**/*.spec.ts',
      'src/modules/time-tracking/application/compliance/sagas/__tests__/**/*.spec.ts',
      'src/modules/time-tracking/application/compliance/commands/__tests__/**/*.spec.ts',
      'src/modules/time-tracking/application/compliance/queries/__tests__/**/*.spec.ts',
      'src/modules/time-tracking/domain/aggregates/compliance/__tests__/**/*.spec.ts',
      'src/modules/time-tracking/presentation/compliance/__tests__/**/*.spec.ts',
      'src/modules/time-tracking/domain/aggregates/performance/__tests__/**/*.spec.ts',
      'src/modules/time-tracking/application/performance/__tests__/**/*.spec.ts',
      'src/modules/time-tracking/presentation/performance/__tests__/**/*.spec.ts',
      'src/modules/time-tracking/infrastructure/__tests__/**/*.spec.ts'
    ]
  }
});
