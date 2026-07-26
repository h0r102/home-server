import { test, expect } from '@playwright/test';

// 実行前提: SWITCHBOT_MOCK=true でモックのエアコン/センサーデバイスが
// 見える状態のdevサーバーが baseURL で起動していること(package.jsonのe2eスクリプト参照)。

test.describe('ゴールデンパス: ログイン → エアコン操作 → リスト作成 → ログアウト', () => {
  test('一連の操作が完了する', async ({ page }) => {
    // 1. ログイン
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'changeme123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await expect(page.locator('h1')).toHaveText('ホームポータル');

    // 2. エアコン操作
    await page.goto('/aircon');
    await expect(page.getByText('モックエアコン')).toBeVisible();
    await page.getByRole('button', { name: '＋' }).first().click();
    await page.getByRole('button', { name: '適用' }).click();
    await expect(page.getByText('最終操作:')).toContainText('admin');

    // 2.5. ヘッダーのブランドリンクからホームへ戻れることを確認
    await page.getByRole('link', { name: 'ホームポータル' }).click();
    await page.waitForURL('/');

    // 3. リスト作成・項目追加・完了切替
    await page.goto('/lists');
    await page.getByPlaceholder('新しいリスト名').fill('E2Eテストリスト');
    await page.getByRole('button', { name: '作成' }).click();
    await expect(page.getByText('E2Eテストリスト')).toBeVisible();

    await page.getByText('E2Eテストリスト').click();
    await expect(page).toHaveURL(/\/lists\/.+/);

    await page.getByPlaceholder('項目を追加').fill('牛乳');
    await page.getByRole('button', { name: '追加' }).click();
    await expect(page.getByText('牛乳')).toBeVisible();

    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.click();
    await expect(checkbox).toBeChecked();

    // 4. ログアウト（ヘッダーが共通化されたため、リスト詳細ページなどダッシュボード以外からも操作できる）
    await page.getByRole('button', { name: 'ログアウト' }).click();
    await page.waitForURL('/login');
  });

  test('ゲストはエアコン操作もリスト作成もできない', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'e2e-guest');
    await page.fill('#password', 'guestpass123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto('/aircon');
    await expect(page.getByText('閲覧のみ（操作権限がありません）')).toBeVisible();

    await page.goto('/lists');
    await expect(page.getByPlaceholder('新しいリスト名')).toHaveCount(0);
  });
});
