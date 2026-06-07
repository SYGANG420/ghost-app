import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StockPage from '../pages/StockPage.jsx';

const products = [
  { id: 1, name: '少量商品', quantity: 1, threshold: 3, purchasePrice: 1000, retailPrice: 2000 },
  { id: 2, name: '通常商品', quantity: 9, threshold: 3, purchasePrice: 500, retailPrice: 900 },
];

function renderStock(overrides = {}) {
  return render(
    <StockPage
      products={products}
      stockHistory={[]}
      onSaveProduct={vi.fn()}
      onDeleteProduct={vi.fn()}
      onRestockProduct={vi.fn()}
      onInventoryProduct={vi.fn()}
      {...overrides}
    />
  );
}

describe('StockPage', () => {
  it('在庫一覧が表示される', () => {
    renderStock();
    expect(screen.getByText('少量商品')).toBeInTheDocument();
    expect(screen.getByText('通常商品')).toBeInTheDocument();
  });

  it('閾値以下の商品が警告表示される', () => {
    renderStock();
    expect(screen.getByText('少量')).toBeInTheDocument();
  });

  it('補充フォームが動く', () => {
    const onRestockProduct = vi.fn();
    renderStock({ onRestockProduct });
    const input = screen.getAllByLabelText('補充数')[0];
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.click(screen.getAllByRole('button', { name: /補充/ })[0]);
    expect(onRestockProduct).toHaveBeenCalledWith(products[0], 5);
  });
});
