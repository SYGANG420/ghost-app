import { useState } from 'react';
import { Edit3, PackagePlus, Plus, Trash2, X } from 'lucide-react';
import { yen } from '../utils/format.js';

const emptyProduct = { name: '', purchasePrice: 0, retailPrice: 0, threshold: 3, quantity: 0 };

export default function StockPage({ products, setProducts, stockHistory, setStockHistory }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [restock, setRestock] = useState({});

  const addHistory = (type, productName, quantity = 0) => {
    setStockHistory((current) => [{ id: Date.now(), date: new Date().toISOString(), type, productName, quantity }, ...current].slice(0, 30));
  };

  const addProduct = (event) => {
    event.preventDefault();
    if (editingId) {
      setProducts((current) =>
        current.map((item) =>
          item.id === editingId
            ? {
                ...item,
                code: draft.name.slice(0, 1).toUpperCase() || item.code || 'N',
                name: draft.name || item.name,
                quantity: Number(draft.quantity) || 0,
                threshold: Number(draft.threshold) || 0,
                purchasePrice: Number(draft.purchasePrice) || 0,
                retailPrice: Number(draft.retailPrice) || 0,
              }
            : item
        )
      );
      addHistory('\u7de8\u96c6', draft.name || '\u5546\u54c1', 0);
      setEditingId(null);
      setDraft(emptyProduct);
      setModalOpen(false);
      return;
    }
    const nextProduct = {
      id: `product_${Date.now()}`,
      code: draft.name.slice(0, 1).toUpperCase() || 'N',
      name: draft.name || '\u65b0\u898f\u5546\u54c1',
      quantity: Number(draft.quantity) || 0,
      threshold: Number(draft.threshold) || 0,
      purchasePrice: Number(draft.purchasePrice) || 0,
      retailPrice: Number(draft.retailPrice) || 0,
    };
    setProducts((current) => [nextProduct, ...current]);
    addHistory('\u767b\u9332', nextProduct.name, nextProduct.quantity);
    setDraft(emptyProduct);
    setModalOpen(false);
  };

  const openAddModal = () => {
    setEditingId(null);
    setDraft(emptyProduct);
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      purchasePrice: item.purchasePrice,
      retailPrice: item.retailPrice,
      threshold: item.threshold,
      quantity: item.quantity,
    });
    setModalOpen(true);
  };

  const deleteProduct = (item) => {
    const ok = window.confirm(`${item.name}\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f`);
    if (!ok) return;
    setProducts((current) => current.filter((product) => product.id !== item.id));
    addHistory('\u524a\u9664', item.name, item.quantity);
  };

  const restockProduct = (id) => {
    const quantity = Number(restock[id]) || 0;
    if (quantity <= 0) return;
    const product = products.find((item) => item.id === id);
    setProducts((current) => current.map((item) => (item.id === id ? { ...item, quantity: item.quantity + quantity } : item)));
    addHistory('\u88dc\u5145', product?.name || id, quantity);
    setRestock((current) => ({ ...current, [id]: '' }));
  };

  return (
    <section className="page-stack">
      <div className="panel-title-row wide-panel">
        <div>
          <h2>&#x5546;&#x54c1;&#x30de;&#x30b9;&#x30bf;</h2>
          <p className="muted">&#x5728;&#x5eab;&#x30fb;&#x4fa1;&#x683c;&#x30fb;&#x95be;&#x5024;&#x3092;&#x7ba1;&#x7406;</p>
        </div>
        <button type="button" onClick={openAddModal}><PackagePlus size={16} /> &#x5546;&#x54c1;&#x767b;&#x9332;</button>
      </div>

      {products.map((item) => {
        const alert = item.quantity <= item.threshold;
        return (
          <div className={alert ? 'stock-card alert' : 'stock-card'} key={item.id}>
            <div className="panel-title-row">
              <h2>{item.name}</h2>
              <span className={alert ? 'pill danger' : 'pill online'}>{alert ? '\u5c11\u91cf' : '\u6b63\u5e38'}</span>
            </div>
            <div className="stock-count">
              <strong>{item.quantity}</strong>
              <span>&#x95be;&#x5024; {item.threshold}</span>
            </div>
            <div className="bar-track"><span style={{ width: `${Math.min((item.quantity / Math.max(item.threshold * 3, 1)) * 100, 100)}%` }} /></div>
            <div className="stock-meta">
              <span>&#x4ed5;&#x5165; {yen(item.purchasePrice)}</span>
              <span>&#x5c0f;&#x58f2; {yen(item.retailPrice)}</span>
            </div>
            <div className="stock-inputs">
              <label>&#x88dc;&#x5145;&#x6570;<input type="number" value={restock[item.id] || ''} onChange={(event) => setRestock((current) => ({ ...current, [item.id]: event.target.value }))} /></label>
              <button className="stock-action-button" type="button" onClick={() => restockProduct(item.id)}><Plus size={14} /> &#x88dc;&#x5145;</button>
              <button className="stock-action-button" type="button" onClick={() => openEditModal(item)}><Edit3 size={14} /> &#x7de8;&#x96c6;</button>
              <button className="stock-action-button danger-button" type="button" onClick={() => deleteProduct(item)}><Trash2 size={14} /> &#x524a;&#x9664;</button>
            </div>
          </div>
        );
      })}

      <div className="wide-panel cyber-card">
        <h2>&#x5728;&#x5eab;&#x5909;&#x66f4;&#x5c65;&#x6b74;</h2>
        {stockHistory.length === 0 ? (
          <p className="muted">&#x5c65;&#x6b74;&#x306a;&#x3057;</p>
        ) : stockHistory.map((item) => (
          <div className="feed-row" key={item.id}>
            <span>{new Date(item.date).toLocaleString('ja-JP')} / {item.type} / {item.productName}</span>
            <strong>{item.quantity}</strong>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="modal-backdrop">
          <form className="modal-panel compact-form" onSubmit={addProduct}>
            <div className="panel-title-row">
              <h2>{editingId ? '\u5546\u54c1\u7de8\u96c6' : '\u5546\u54c1\u767b\u9332'}</h2>
              <button type="button" onClick={() => setModalOpen(false)}><X size={16} /></button>
            </div>
            <label>&#x5546;&#x54c1;&#x540d;<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label>&#x4ed5;&#x5165;&#x308c;&#x4fa1;&#x683c;<input type="number" value={draft.purchasePrice} onChange={(event) => setDraft({ ...draft, purchasePrice: event.target.value })} /></label>
            <label>&#x5c0f;&#x58f2;&#x4fa1;&#x683c;<input type="number" value={draft.retailPrice} onChange={(event) => setDraft({ ...draft, retailPrice: event.target.value })} /></label>
            <label>&#x95be;&#x5024;<input type="number" value={draft.threshold} onChange={(event) => setDraft({ ...draft, threshold: event.target.value })} /></label>
            <label>&#x5728;&#x5eab;&#x6570;<input type="number" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} /></label>
            <button type="submit">{editingId ? '\u4fdd\u5b58' : '\u767b\u9332'}</button>
          </form>
        </div>
      )}
    </section>
  );
}
