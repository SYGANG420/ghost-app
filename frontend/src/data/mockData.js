export const products = [
  { id: 'product_a', code: 'A', name: 'A', quantity: 18, threshold: 5, purchasePrice: 52000, retailPrice: 128000 },
  { id: 'product_b', code: 'B', name: 'B', quantity: 11, threshold: 4, purchasePrice: 43000, retailPrice: 96000 },
  { id: 'product_c', code: 'C', name: 'C', quantity: 7, threshold: 3, purchasePrice: 63000, retailPrice: 146000 },
];

export const sales = [
  {
    id: 1,
    date: '2026-06-02',
    deviceId: 'device_a',
    staff: 'A',
    productId: 'product_a',
    productName: 'A',
    quantity: 1,
    unitPrice: 128000,
    purchasePrice: 52000,
    delivery: true,
    deliveryFee: 6000,
    revenue: 128000,
    grossProfit: 70000,
  },
  {
    id: 2,
    date: '2026-06-04',
    deviceId: 'device_b',
    staff: 'B',
    productId: 'product_b',
    productName: 'B',
    quantity: 2,
    unitPrice: 96000,
    purchasePrice: 43000,
    delivery: false,
    deliveryFee: 0,
    revenue: 192000,
    grossProfit: 106000,
  },
  {
    id: 3,
    date: '2026-06-06',
    deviceId: 'device_a',
    staff: 'A',
    productId: 'product_c',
    productName: 'C',
    quantity: 1,
    unitPrice: 146000,
    purchasePrice: 63000,
    delivery: true,
    deliveryFee: 8000,
    revenue: 146000,
    grossProfit: 75000,
  },
];

export const investments = [
  { id: 1, investor: 'A', date: '2026-05-04', amount: 700000, memo: 'Initial pool' },
  { id: 2, investor: 'B', date: '2026-05-11', amount: 500000, memo: 'Device and stock' },
  { id: 3, investor: 'A', date: '2026-06-02', amount: 180000, memo: 'Restock reserve' },
];
