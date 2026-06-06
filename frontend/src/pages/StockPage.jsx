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
        <strong>在庫管理</strong>
        <span>枠色が黄色なら閾値以下</span>
      </div>
      {items.map((item) => {
        const alert = item.quantity <= item.threshold;
        return (
          <div className={alert ? 'stock-card alert' : 'stock-card'} key={item.id}>
            <div className="panel-title-row">
              <h2>{item.name}</h2>
              <span className={alert ? 'pill danger' : 'pill online'}>{alert ? '少量' : '正常'}</span>
            </div>
            <div className="stock-count">
              <strong>{item.quantity}</strong>
              <span>閾値 {item.threshold}</span>
            </div>
            <div className="bar-track">
              <span style={{ width: `${Math.min((item.quantity / Math.max(item.threshold * 3, 1)) * 100, 100)}%` }} />
            </div>
            <div className="stock-inputs">
              <label>数量<input type="number" value={item.quantity} onChange={(event) => updateItem(item.id, 'quantity', event.target.value)} /></label>
              <label>閾値<input type="number" value={item.threshold} onChange={(event) => updateItem(item.id, 'threshold', event.target.value)} /></label>
              <label>仕入<input type="number" value={item.purchasePrice} onChange={(event) => updateItem(item.id, 'purchasePrice', event.target.value)} /></label>
            </div>
          </div>
        );
      })}
    </section>
  );
}
