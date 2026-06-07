import { useState } from 'react';
import { Edit3, Minus, Plus, Save, Trash2 } from 'lucide-react';
import { yen } from '../utils/format.js';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function SalesPage({ deviceId, products, salesRecords, selectedMonth, setSelectedMonth, onSaveSale, onDeleteSale, saving }) {
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
  const [staffFilter, setStaffFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');

  const selectedProduct = products.find((item) => String(item.id) === String(draft.productId));
  const editingSale = salesRecords.find((item) => item.id === editingId);
  const quantity = Math.max(Number(draft.quantity) || 1, 1);
  const purchasePrice = selectedProduct?.purchasePrice || 0;
  const salePrice = Number(draft.salePrice) || 0;
  const deliveryFee = draft.delivery ? Number(draft.deliveryFee) || 0 : 0;
  const revenue = selectedProduct ? salePrice * quantity : 0;
  const productGrossProfit = selectedProduct ? revenue - purchasePrice * quantity : 0;
  const totalProfit = productGrossProfit + deliveryFee;
  const availableQuantity = selectedProduct
    ? selectedProduct.quantity + (String(editingSale?.productId) === String(selectedProduct.id) ? editingSale.quantity : 0)
    : 0;
  const insufficient = selectedProduct ? quantity > availableQuantity : true;
  const formReady = Boolean(draft.date && draft.staff && selectedProduct && salePrice > 0 && !insufficient);
  const filteredRecords = salesRecords.filter((item) => (
    String(item.date || '').startsWith(selectedMonth)
    && (!staffFilter || item.staff === staffFilter)
    && (!productFilter || String(item.productId) === String(productFilter))
  ));
  const monthlyTotal = filteredRecords.reduce((sum, item) => sum + item.revenue, 0);

  const updateQuantity = (next) => {
    setDraft((current) => ({ ...current, quantity: Math.max(next, 1) }));
  };

  const selectProduct = (productId) => {
    setDraft((current) => ({ ...current, productId }));
  };

  const applyKey = (key) => {
    setDraft((current) => {
      if (key === 'clear') return { ...current, salePrice: '' };
      if (key === 'back') return { ...current, salePrice: String(current.salePrice).slice(0, -1) };
      return { ...current, salePrice: `${current.salePrice}${key}` };
    });
  };

  const exportCsv = () => {
    const rows = [['date', 'product', 'staff', 'quantity', 'revenue', 'gross_profit', 'delivery_fee'], ...filteredRecords.map((item) => [
      item.date,
      item.productName,
      item.staff,
      item.quantity,
      item.revenue,
      item.grossProfit,
      item.deliveryFee,
    ])];
    const blob = new Blob([rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sales-${selectedMonth}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
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

    const ok = window.confirm(`\u767b\u9332\u5185\u5bb9\n${sale.productName} / ${quantity}\u70b9\n\u58f2\u4e0a ${yen(revenue)}\n\u7c97\u5229 ${yen(productGrossProfit)}\n\u914d\u9054 ${yen(deliveryFee)}`);
    if (!ok) return;
    onSaveSale(sale, Boolean(editingId), editingSale);
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
    onDeleteSale(sale);
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
      <div className="wide-panel compact-form">
        <h2>&#x5c65;&#x6b74;&#x30d5;&#x30a3;&#x30eb;&#x30bf;&#x30fc;</h2>
        <div className="button-row">
          <select value={staffFilter} onChange={(event) => setStaffFilter(event.target.value)}>
            <option value="">&#x5168;&#x62c5;&#x5f53;</option>
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
          <select value={productFilter} onChange={(event) => setProductFilter(event.target.value)}>
            <option value="">&#x5168;&#x5546;&#x54c1;</option>
            {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button type="button" onClick={exportCsv}>CSV</button>
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
        {selectedProduct && (
          <div className="button-row">
            <button type="button" onClick={() => setDraft((current) => ({ ...current, salePrice: String(selectedProduct.retailPrice || '') }))}>&#x5c0f;&#x58f2; {yen(selectedProduct.retailPrice)}</button>
            <button type="button" onClick={() => setDraft((current) => ({ ...current, salePrice: String(Math.round((selectedProduct.retailPrice || 0) * 0.95)) }))}>95%</button>
            <button type="button" onClick={() => setDraft((current) => ({ ...current, salePrice: String(Math.round((selectedProduct.retailPrice || 0) * 1.05)) }))}>105%</button>
          </div>
        )}
        <div className="keypad-grid">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].map((key) => (
            <button key={key} type="button" onClick={() => applyKey(key)}>{key === 'clear' ? 'C' : key === 'back' ? '\u232b' : key}</button>
          ))}
        </div>

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

        <button type="submit" disabled={!formReady || saving}>
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
