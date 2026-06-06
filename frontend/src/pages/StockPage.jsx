import { useState } from 'react';
import { stock as seedStock } from '../data/mockData.js';

export default function StockPage() {
  const [items, setItems] = useState(seedStock);

  const updateItem = (id, key, value) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [key]: Number(value) } : item)));
  };

  return (
    <section className="page-stack">
      <div className="alert-strip">
        <span className="signal-dot yellow" />
        <strong>STOCK MATRIX</strong>
        <span>Red border means threshold alert</span>
      </div>
      {items.map((item) => {
        const alert = item.quantity <= item.threshold;
        return (
          <div className={alert ? 'stock-card alert' : 'stock-card'} key={item.id}>
            <div className="panel-title-row">
              <h2>{item.name}</h2>
              <span className={alert ? 'pill danger' : 'pill online'}>{alert ? 'LOW' : 'OK'}</span>
            </div>
            <div className="stock-count">
              <strong>{item.quantity}</strong>
              <span>THRESHOLD {item.threshold}</span>
            </div>
            <div className="bar-track">
              <span style={{ width: `${Math.min((item.quantity / Math.max(item.threshold * 3, 1)) * 100, 100)}%` }} />
            </div>
            <div className="stock-inputs">
              <label>QTY<input type="number" value={item.quantity} onChange={(event) => updateItem(item.id, 'quantity', event.target.value)} /></label>
              <label>THRESHOLD<input type="number" value={item.threshold} onChange={(event) => updateItem(item.id, 'threshold', event.target.value)} /></label>
              <label>BUY<input type="number" value={item.purchasePrice} onChange={(event) => updateItem(item.id, 'purchasePrice', event.target.value)} /></label>
            </div>
          </div>
        );
      })}
    </section>
  );
}
