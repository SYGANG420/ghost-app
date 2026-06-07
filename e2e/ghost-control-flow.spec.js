import { expect, test } from '@playwright/test';

test('GHOST CONTROL full screen flow', async ({ page }) => {
  await page.goto('https://ghost-control.duckdns.org');
  await page.addStyleTag({ content: '.notification-stack { display: none !important; }' });

  await expect(page.getByRole('button', { name: '1' })).toBeVisible();
  for (const key of ['1', '9', '8', '4', '=']) {
    await page.getByRole('button', { name: key }).click();
  }

  await expect(page.getByText('端末初期設定')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: '端末A' }).click();

  await expect(page.getByText('端末A ダッシュボード')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'MAP' }).click();
  await expect(page.getByRole('heading', { name: '位置監視' })).toBeVisible();
  await expect(page.getByText('CartoDB Dark Matter')).toBeVisible();

  await page.getByRole('button', { name: 'SALES' }).click();
  await expect(page.getByText(/売上登録/)).toBeVisible();

  await page.getByRole('button', { name: 'STOCK' }).click();
  await expect(page.getByRole('heading', { name: '商品マスタ' })).toBeVisible();

  await page.getByRole('button', { name: 'KPI' }).click();
  await expect(page.getByRole('heading', { name: '月間売上' })).toBeVisible();

  await page.getByRole('button', { name: 'CTRL' }).click();
  await expect(page.getByRole('button', { name: /端末A ワイプ/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /電卓へ戻る/ })).toBeVisible();
});
