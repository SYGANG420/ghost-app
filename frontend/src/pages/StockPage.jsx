import { useState } from 'react';
import { stock as seedStock } from '../data/mockData.js';

export default function StockPage() {
  const [items, setItems] = useState(seedStock);

  const updateItem = (id, key, value) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [key]: Number(value) } : item)));
  };

  return (
    <section className="wide-panel">
      <h2>STOCK MATRIX</h2>
      <div className="table">
        <div className="table-head"><span>ITEM</span><span>QTY</span><span>THRESHOLD</span><span>BUY</span><span>STATE</span></div>
        {items.map((item) => {
          const alert = item.quantity <= item.threshold;
          return (
            <div className={alert ? 'table-row alert' : 'table-row'} key={item.id}>
              <span>{item.name}</span>
              <input type="number" value={item.quantity} onChange={(event) => updateItem(item.id, 'quantity', event.target.value)} />
              <input type="number" value={item.threshold} onChange={(event) => updateItem(item.id, 'threshold', event.target.value)} />
              <input type="number" value={item.purchasePrice} onChange={(event) => updateItem(item.id, 'purchasePrice', event.target.value)} />
              <strong>{alert ? 'LOW' : 'OK'}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}
