import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SalesPage from '../pages/SalesPage.jsx';

const products = [{ id: 1, code: 'A', name: '商品A', quantity: 10, purchasePrice: 1000, retailPrice: 2000 }];

function renderSales(onSaveSale = vi.fn()) {
  render(
    <SalesPage
      deviceId="device_a"
      products={products}
      salesRecords={[]}
      selectedMonth="2026-06"
      setSelectedMonth={vi.fn()}
      onSaveSale={onSaveSale}
      onDeleteSale={vi.fn()}
      saving={false}
    />
  );
}

describe('SalesPage', () => {
  beforeEach(() => {
    window.confirm = vi.fn(() => true);
  });

  it('商品選択が動く', () => {
    renderSales();
    fireEvent.change(screen.getByLabelText('商品選択'), { target: { value: '1' } });
    expect(screen.getByText('小売 ¥2,000')).toBeInTheDocument();
  });

  it('数量増減ボタンが動く', () => {
    renderSales();
    const stepper = screen.getByText('数量').closest('.stepper-row');
    fireEvent.click(within(stepper).getAllByRole('button')[1]);
    expect(within(stepper).getByText('2')).toBeInTheDocument();
  });

  it('粗利が自動計算される', () => {
    renderSales();
    fireEvent.change(screen.getByLabelText('商品選択'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('販売価格'), { target: { value: '2500' } });
    expect(screen.getByText(/商品粗利 ¥1,500/)).toBeInTheDocument();
  });

  it('配達ありで配達料が加算される', () => {
    renderSales();
    fireEvent.change(screen.getByLabelText('商品選択'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('販売価格'), { target: { value: '2500' } });
    fireEvent.click(screen.getByLabelText('配達あり'));
    fireEvent.change(screen.getByLabelText('配達料'), { target: { value: '500' } });
    expect(screen.getByText(/合計 ¥2,000/)).toBeInTheDocument();
  });

  it('登録ボタンでAPI相当の保存関数が呼ばれる', () => {
    const onSaveSale = vi.fn();
    renderSales(onSaveSale);
    fireEvent.change(screen.getByLabelText('商品選択'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('担当者'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('販売価格'), { target: { value: '2500' } });
    fireEvent.click(screen.getByRole('button', { name: /登録/ }));
    expect(onSaveSale).toHaveBeenCalledTimes(1);
  });
});
