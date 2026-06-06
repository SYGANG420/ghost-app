import { useState } from 'react';
import { Edit3, Minus, Plus, Save, Trash2 } from 'lucide-react';
import { yen } from '../utils/format.js';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function SalesPage({ deviceId, products, setProducts, salesRecords, setSalesRecords, selectedMonth, setSelectedMonth }) {
  const [draft, setDraft] = useState({
    date: today(),
    productId: '',
    quantity: 1,
    staff: '',
    delivery: false,
    deliveryFee: 0,
    salePrice: '',
  });
  const [editingId, setEditingId] = useState(null);

  const selectedProduct = products.find((item) => item.id === draft.productId);
  const editingSale = salesRecords.find((item) => item.id === editingId);
  const quantity = Math.max(Number(draft.quantity) || 1, 1);
  const purchasePrice = selectedProduct?.purchasePrice || 0;
  const salePrice = Number(draft.salePrice) || 0;
  const deliveryFee = draft.delivery ? Number(draft.deliveryFee) || 0 : 0;
  const revenue = selectedProduct ? salePrice * quantity : 0;
  const productGrossProfit = selectedProduct ? revenue - purchasePrice * quantity : 0;
  const totalProfit = productGrossProfit + deliveryFee;
  const availableQuantity = selectedProduct
    ? selectedProduct.quantity + (editingSale?.productId === selectedProduct.id ? editingSale.quantity : 0)
    : 0;
  const insufficient = selectedProduct ? quantity > availableQuantity : true;
  const formReady = Boolean(draft.date && draft.staff && selectedProduct && salePrice > 0 && !insufficient);
  const filteredRecords = salesRecords.filter((item) => String(item.date || '').startsWith(selectedMonth));
  const monthlyTotal = filteredRecords.reduce((sum, item) => sum + item.revenue, 0);

  const updateQuantity = (next) => {
    setDraft((current) => ({ ...current, quantity: Math.max(next, 1) }));
  };

  const selectProduct = (productId) => {
    setDraft((current) => ({ ...current, productId }));
  };

  const registerSale = (event) => {
    event.preventDefault();
    if (!formReady) return;

    const sale = {
      id: editingId || Date.now(),
      date: draft.date,
      deviceId,
      staff: draft.staff,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity,
      unitPrice: salePrice,
      purchasePrice,
      delivery: draft.delivery,
      deliveryFee,
      revenue,
      grossProfit: productGrossProfit,
    };

    setSalesRecords((current) => {
      if (editingId) return current.map((item) => (item.id === editingId ? sale : item));
      return [sale, ...current];
    });
    setProducts((current) =>
      current.map((item) => {
        let nextQuantity = item.quantity;
        if (editingSale && item.id === editingSale.productId) nextQuantity += editingSale.quantity;
        if (item.id === selectedProduct.id) nextQuantity -= quantity;
        return { ...item, quantity: nextQuantity };
      })
    );
    setEditingId(null);
    setDraft({ date: today(), productId: '', quantity: 1, staff: '', delivery: false, deliveryFee: 0, salePrice: '' });
  };

  const editSale = (sale) => {
    setEditingId(sale.id);
    setDraft({
      date: sale.date,
      productId: sale.productId,
      quantity: sale.quantity,
      staff: sale.staff,
      delivery: sale.delivery,
      deliveryFee: sale.deliveryFee || 0,
      salePrice: sale.unitPrice || '',
    });
  };

  const deleteSale = (sale) => {
    const ok = window.confirm('\u3053\u306e\u58f2\u4e0a\u5c65\u6b74\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f');
    if (!ok) return;
    setSalesRecords((current) => current.filter((item) => item.id !== sale.id));
    setProducts((current) => current.map((item) => (item.id === sale.productId ? { ...item, quantity: item.quantity + sale.quantity } : item)));
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
          <strong>{filteredRecords.length}&#x4ef6;</strong>
        </div>
        <div className="metric-card">
          <span>&#x8868;&#x793a;&#x6708;</span>
          <strong>{selectedMonth}</strong>
        </div>
      </div>

      <form className="wide-panel cyber-card compact-form" onSubmit={registerSale}>
        <h2>{editingId ? '\u58f2\u4e0a\u4fee\u6b63' : '\u58f2\u4e0a\u767b\u9332'}</h2>
        <label>
          &#x8868;&#x793a;&#x6708;
          <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
        </label>
        <label>
          &#x65e5;&#x4ed8;
          <input type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} />
        </label>
        <label>
          &#x5546;&#x54c1;&#x9078;&#x629e;
          <select value={draft.productId} onChange={(event) => selectProduct(event.target.value)}>
            <option value="">&#x672a;&#x9078;&#x629e;</option>
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
            <option value="">&#x9078;&#x629e;&#x3057;&#x3066;&#x304f;&#x3060;&#x3055;&#x3044;</option>
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
        </label>

        <label>
          &#x8ca9;&#x58f2;&#x4fa1;&#x683c;
          <input placeholder="0" type="number" value={draft.salePrice} onChange={(event) => setDraft((current) => ({ ...current, salePrice: event.target.value }))} />
        </label>

        <div className="readonly-row">
          <span>&#x5546;&#x54c1;&#x30de;&#x30b9;&#x30bf;&#x4ed5;&#x5165;&#x308c;&#x4fa1;&#x683c;</span>
          <strong>{yen(purchasePrice)}</strong>
        </div>

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

        <div className={!selectedProduct || insufficient ? 'alert-strip danger-inline' : 'alert-strip'}>
          <span className={!selectedProduct || insufficient ? 'signal-dot red' : 'signal-dot'} />
          {!selectedProduct ? (
            <strong>&#x5546;&#x54c1;&#x3092;&#x9078;&#x629e;&#x3057;&#x3066;&#x304f;&#x3060;&#x3055;&#x3044;</strong>
          ) : insufficient ? (
            <strong>&#x5728;&#x5eab;&#x4e0d;&#x8db3;&#x306e;&#x305f;&#x3081;&#x767b;&#x9332;&#x4e0d;&#x53ef;</strong>
          ) : (
            <strong>&#x5728;&#x5eab; {availableQuantity} / &#x767b;&#x9332;&#x53ef;&#x80fd;</strong>
          )}
          <span>&#x5546;&#x54c1;&#x7c97;&#x5229; {yen(productGrossProfit)} / &#x914d;&#x9054;&#x6599; {yen(deliveryFee)} / &#x5408;&#x8a08; {yen(totalProfit)}</span>
        </div>

        <button type="submit" disabled={!formReady}>
          <Save size={16} /> {editingId ? '\u4fee\u6b63' : '\u767b\u9332'}
        </button>
        {editingId && (
          <button type="button" onClick={() => {
            setEditingId(null);
            setDraft({ date: today(), productId: '', quantity: 1, staff: '', delivery: false, deliveryFee: 0, salePrice: '' });
          }}>
            &#x4fee;&#x6b63;&#x3092;&#x4e2d;&#x6b62;
          </button>
        )}
      </form>

      <div className="wide-panel cyber-card">
        <h2>&#x58f2;&#x4e0a;&#x5c65;&#x6b74;</h2>
        {filteredRecords.map((item) => (
          <div className="history-row" key={item.id}>
            <span>{item.date}</span>
            <strong>{item.productName}</strong>
            <span>{item.quantity}&#x70b9;</span>
            <span>{yen(item.revenue)}</span>
            <em>{yen((item.grossProfit || 0) + (item.deliveryFee || 0))}</em>
            <button className="icon-action" type="button" onClick={() => editSale(item)}><Edit3 size={14} /></button>
            <button className="icon-action danger-button" type="button" onClick={() => deleteSale(item)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </section>
  );
}
