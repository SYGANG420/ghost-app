import { useMemo, useState } from 'react';
import { yen } from '../utils/format.js';

export default function SalesPage() {
  const [price, setPrice] = useState(128000);
  const [cost, setCost] = useState(52000);
  const [expense, setExpense] = useState(9000);
  const gross = useMemo(() => price - cost - expense, [price, cost, expense]);

  return (
    <section className="page-stack">
      <div className="metric-grid two">
        <div className="metric-card">
          <span>販売価格</span>
          <strong>{yen(price)}</strong>
        </div>
        <div className="metric-card">
          <span>リアルタイム粗利</span>
          <strong className={gross < 0 ? 'red-text' : ''}>{yen(gross)}</strong>
        </div>
      </div>
      <div className="wide-panel cyber-card">
        <h2>売上登録</h2>
        <label>販売価格<input type="number" value={price} onChange={(event) => setPrice(Number(event.target.value))} /></label>
        <label>仕入価格<input type="number" value={cost} onChange={(event) => setCost(Number(event.target.value))} /></label>
        <label>経費<input type="number" value={expense} onChange={(event) => setExpense(Number(event.target.value))} /></label>
      </div>
      <div className="wide-panel cyber-card">
        <h2>粗利内訳</h2>
        <div className="feed-row"><span>販売価格</span><strong>{yen(price)}</strong></div>
        <div className="feed-row"><span>仕入価格</span><strong>{yen(cost)}</strong></div>
        <div className="feed-row"><span>経費</span><strong>{yen(expense)}</strong></div>
      </div>
    </section>
  );
}
