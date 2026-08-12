import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const testDbUrl = env.DATABASE_URL_TEST;
  const prodDbUrl = env.DATABASE_URL;

  if (!testDbUrl) {
    throw new Error('🛑 E2E FATAL: DATABASE_URL_TEST is missing. Refusing to run E2E suite.');
  }
  
  if (testDbUrl === prodDbUrl) {
    throw new Error('🛑 E2E FATAL: DATABASE_URL_TEST equals DATABASE_URL. Refusing to run E2E suite against potential production DB.');
  }

  // Very basic safeguard: usually production DBs won't contain "test" in the name
  if (!testDbUrl.toLowerCase().includes('test')) {
    console.warn('⚠️ E2E WARNING: DATABASE_URL_TEST does not contain "test" in its string. Ensure this is truly a dedicated test environment.');
  }
  
  return {
    test: {
      globals: true,
      environment: 'node',
      include: ['src/modules/time-tracking/application/compliance/__tests__/**/*.spec.ts'],
      exclude: ['**/node_modules/**', '**/dist/**'],
      testTimeout: 30000,
      env: {
        ...env,
        NODE_ENV: 'test',
        // Ensure Prisma uses the test database URL
        DATABASE_URL: env.DATABASE_URL_TEST || env.DATABASE_URL,
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@modules': resolve(__dirname, './src/modules'),
        '@shared': resolve(__dirname, './src/shared'),
        '@config': resolve(__dirname, './src/config'),
      },
    },
  };
});
