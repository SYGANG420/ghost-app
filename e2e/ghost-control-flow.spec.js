import { expect, test } from '@playwright/test';

test('GHOST CONTROL full screen flow', async ({ page }) => {
  await page.goto('https://ghost-control.duckdns.org');

  await expect(page.getByRole('button', { name: '1' })).toBeVisible();
  for (const key of ['1', '9', '8', '4', '=']) {
    await page.getByRole('button', { name: key }).click();
  }

  await expect(page.getByText('GHOST CONTROL')).toBeVisible();
  const deviceA = page.getByRole('button', { name: /device_a|端末A|A/ }).first();
  if (await deviceA.isVisible().catch(() => false)) {
    await deviceA.click();
  }

  await expect(page.getByText(/HOME|ダッシュボード|今月/)).toBeVisible();
  await page.getByText('MAP').click();
  await expect(page.locator('.leaflet-container')).toBeVisible();

  await page.getByText('SALES').click();
  await expect(page.getByText(/売上登録/)).toBeVisible();

  await page.getByText('STOCK').click();
  await expect(page.getByText(/商品マスタ|在庫/)).toBeVisible();

  await page.getByText('KPI').click();
  await expect(page.getByText(/月間売上|実績/)).toBeVisible();

  await page.getByText('CTRL').click();
  await expect(page.getByText(/端末A ワイプ|電卓へ戻る/)).toBeVisible();
});
