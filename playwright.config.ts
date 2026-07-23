import { defineConfig } from '@playwright/test';

const PORT = 3110;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  webServer: {
    command: 'npm run e2e:server',
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    // iPhoneのSafari相当のビューポートで確認する(D10)。フルのモバイル
    // デバイスプリセット(isMobile/hasTouch等)はサンドボックス環境の
    // 特定のChromiumビルドと相性が悪く早期クラッシュするため、
    // ビューポートサイズのみ指定するに留める。
    viewport: { width: 390, height: 844 },
    launchOptions: {
      executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  },
});
