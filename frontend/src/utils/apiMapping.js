export function normalizeProduct(item) {
  return {
    id: item.id,
    code: item.code || String(item.name || 'N').slice(0, 1).toUpperCase(),
    name: item.name || '',
    quantity: Number(item.quantity) || 0,
    threshold: Number(item.threshold) || 0,
    purchasePrice: Number(item.purchase_price ?? item.purchasePrice) || 0,
    retailPrice: Number(item.retail_price ?? item.retailPrice) || 0,
    alertFlag: Boolean(item.alert_flag ?? item.alertFlag),
    updatedAt: item.updated_at || item.updatedAt || '',
  };
}

export function normalizeSale(item, products = []) {
  const product = products.find((candidate) => String(candidate.id) === String(item.stock_item_id ?? item.productId));
  const quantity = Number(item.quantity) || 1;
  const totalPrice = Number(item.price ?? item.revenue) || 0;
  const cost = Number(item.cost ?? item.purchasePrice) || 0;
  const deliveryFee = Number(item.delivery_fee ?? item.deliveryFee) || 0;
  return {
    id: item.id,
    date: item.sale_date || item.date || String(item.created_at || '').slice(0, 10),
    deviceId: item.device_id || item.deviceId,
    staff: item.staff || (item.device_id === 'device_b' ? 'B' : 'A'),
    productId: item.stock_item_id ?? item.productId,
    productName: product?.name || item.productName || `#${item.stock_item_id ?? item.productId ?? '-'}`,
    quantity,
    unitPrice: quantity ? Math.round(totalPrice / quantity) : totalPrice,
    purchasePrice: quantity ? Math.round(cost / quantity) : cost,
    delivery: deliveryFee > 0,
    deliveryFee,
    revenue: totalPrice,
    grossProfit: totalPrice - cost - (Number(item.expense) || 0),
  };
}

export function productPayload(product) {
  return {
    name: product.name,
    quantity: Number(product.quantity) || 0,
    threshold: Number(product.threshold) || 0,
    purchase_price: Number(product.purchasePrice) || 0,
    retail_price: Number(product.retailPrice) || 0,
  };
}

export function salePayload(sale) {
  return {
    stock_item_id: sale.productId,
    quantity: Number(sale.quantity) || 1,
    price: Number(sale.revenue) || 0,
    cost: (Number(sale.purchasePrice) || 0) * (Number(sale.quantity) || 1),
    expense: 0,
    delivery_fee: Number(sale.deliveryFee) || 0,
    staff: sale.staff,
    sale_date: sale.date,
    memo: sale.memo || null,
  };
}
