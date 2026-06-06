import { useState } from 'react';
import { Minus, Plus, Save } from 'lucide-react';
import { yen } from '../utils/format.js';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function SalesPage({ deviceId, products, setProducts, salesRecords, setSalesRecords }) {
  const firstProduct = products[0];
  const [draft, setDraft] = useState({
    productId: firstProduct?.id || '',
    quantity: 1,
    staff: deviceId === 'device_b' ? 'B' : 'A',
    delivery: false,
    deliveryFee: 0,
    purchasePrice: firstProduct?.purchasePrice || 0,
  });

  const selectedProduct = products.find((item) => item.id === draft.productId) || firstProduct;
  const quantity = Math.max(Number(draft.quantity) || 1, 1);
  const purchasePrice = Number(draft.purchasePrice) || selectedProduct?.purchasePrice || 0;
  const deliveryFee = draft.delivery ? Number(draft.deliveryFee) || 0 : 0;
  const revenue = selectedProduct ? selectedProduct.retailPrice * quantity : 0;
  const grossProfit = selectedProduct ? revenue - purchasePrice * quantity - deliveryFee : 0;
  const insufficient = selectedProduct ? quantity > selectedProduct.quantity : true;
  const monthlyTotal = salesRecords.reduce((sum, item) => sum + item.revenue, 0);

  const updateQuantity = (next) => {
    setDraft((current) => ({ ...current, quantity: Math.max(next, 1) }));
  };

  const selectProduct = (productId) => {
    const product = products.find((item) => item.id === productId);
    setDraft((current) => ({ ...current, productId, purchasePrice: product?.purchasePrice || 0 }));
  };

  const registerSale = (event) => {
    event.preventDefault();
    if (!selectedProduct || insufficient) return;

    const sale = {
      id: Date.now(),
      date: today(),
      deviceId,
      staff: draft.staff,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity,
      unitPrice: selectedProduct.retailPrice,
      purchasePrice,
      delivery: draft.delivery,
      deliveryFee,
      revenue,
      grossProfit,
    };

    setSalesRecords((current) => [sale, ...current]);
    setProducts((current) => current.map((item) => (item.id === selectedProduct.id ? { ...item, quantity: item.quantity - quantity } : item)));
  };

  return (
    <section className="page-stack">
      <div className="metric-grid two">
        <div className="metric-card">
          <span>&#x4eca;&#x6708;&#x306e;&#x58f2;&#x4e0a;&#x5408;&#x8a08;</span>
          <strong>{yen(monthlyTotal)}</strong>
        </div>
        <div className="metric-card">
          <span>&#x4eca;&#x6708;&#x306e;&#x4ef6;&#x6570;</span>
          <strong>{salesRecords.length}&#x4ef6;</strong>
        </div>
      </div>

      <form className="wide-panel cyber-card compact-form" onSubmit={registerSale}>
        <h2>&#x58f2;&#x4e0a;&#x767b;&#x9332;</h2>
        <label>
          &#x5546;&#x54c1;&#x9078;&#x629e;
          <select value={draft.productId} onChange={(event) => selectProduct(event.target.value)}>
            {products.map((item) => (
              <option value={item.id} key={item.id}>
                {item.code || item.name} / {item.name}
              </option>
            ))}
          </select>
        </label>

        <div className="stepper-row">
          <span>&#x6570;&#x91cf;</span>
          <div className="stepper-control">
            <button type="button" onClick={() => updateQuantity(quantity - 1)}><Minus size={16} /></button>
            <strong>{quantity}</strong>
            <button type="button" onClick={() => updateQuantity(quantity + 1)}><Plus size={16} /></button>
          </div>
        </div>

        <label>
          &#x62c5;&#x5f53;&#x8005;
          <select value={draft.staff} onChange={(event) => setDraft((current) => ({ ...current, staff: event.target.value }))}>
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
        </label>

        <label>
          &#x4ed5;&#x5165;&#x308c;&#x4fa1;&#x683c;
          <input type="number" value={draft.purchasePrice} onChange={(event) => setDraft((current) => ({ ...current, purchasePrice: Number(event.target.value) }))} />
        </label>

        <label className="check-row">
          <input type="checkbox" checked={draft.delivery} onChange={(event) => setDraft((current) => ({ ...current, delivery: event.target.checked }))} />
          &#x914d;&#x9054;&#x3042;&#x308a;
        </label>

        {draft.delivery && (
          <label>
            &#x914d;&#x9054;&#x6599;
            <input type="number" value={draft.deliveryFee} onChange={(event) => setDraft((current) => ({ ...current, deliveryFee: Number(event.target.value) }))} />
          </label>
        )}

        <div className={insufficient ? 'alert-strip danger-inline' : 'alert-strip'}>
          <span className={insufficient ? 'signal-dot red' : 'signal-dot'} />
          {insufficient ? (
            <strong>&#x5728;&#x5eab;&#x4e0d;&#x8db3;&#x306e;&#x305f;&#x3081;&#x767b;&#x9332;&#x4e0d;&#x53ef;</strong>
          ) : (
            <strong>&#x5728;&#x5eab; {selectedProduct?.quantity || 0} / &#x767b;&#x9332;&#x53ef;&#x80fd;</strong>
          )}
          <span>&#x7c97;&#x5229; {yen(grossProfit)}</span>
        </div>

        <button type="submit" disabled={insufficient}>
          <Save size={16} /> &#x767b;&#x9332;
        </button>
      </form>

      <div className="wide-panel cyber-card">
        <h2>&#x58f2;&#x4e0a;&#x5c65;&#x6b74;</h2>
        {salesRecords.map((item) => (
          <div className="history-row" key={item.id}>
            <span>{item.date}</span>
            <strong>{item.productName}</strong>
            <span>{item.quantity}&#x70b9;</span>
            <span>{yen(item.revenue)}</span>
            <em>{yen(item.grossProfit)}</em>
          </div>
        ))}
      </div>
    </section>
  );
}
