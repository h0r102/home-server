import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/globalSetup.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL: 'file:../data/test.db',
      JWT_SECRET: 'test-secret-key-not-for-production',
      SWITCHBOT_MOCK: 'true',
      WEBAUTHN_RP_ID: 'localhost',
      WEBAUTHN_RP_NAME: 'ホームポータル (test)',
      WEBAUTHN_ORIGIN: 'http://localhost:3000',
    },
  },
});
