import { useMemo, useState } from 'react';

export default function SalesPage() {
  const [price, setPrice] = useState(128000);
  const [cost, setCost] = useState(52000);
  const [expense, setExpense] = useState(9000);
  const gross = useMemo(() => price - cost - expense, [price, cost, expense]);

  return (
    <section className="page-stack">
      <div className="metric-grid two">
        <div className="metric-card">
          <span>SALE PRICE</span>
          <strong>JPY {price.toLocaleString()}</strong>
        </div>
        <div className="metric-card">
          <span>REALTIME GROSS</span>
          <strong className={gross < 0 ? 'red-text' : ''}>JPY {gross.toLocaleString()}</strong>
        </div>
      </div>
      <div className="wide-panel cyber-card">
        <h2>SALES ENTRY</h2>
        <label>SALE PRICE<input type="number" value={price} onChange={(event) => setPrice(Number(event.target.value))} /></label>
        <label>PURCHASE COST<input type="number" value={cost} onChange={(event) => setCost(Number(event.target.value))} /></label>
        <label>EXPENSE<input type="number" value={expense} onChange={(event) => setExpense(Number(event.target.value))} /></label>
      </div>
      <div className="wide-panel cyber-card">
        <h2>GROSS BREAKDOWN</h2>
        <div className="feed-row"><span>PRICE</span><strong>JPY {price.toLocaleString()}</strong></div>
        <div className="feed-row"><span>COST</span><strong>JPY {cost.toLocaleString()}</strong></div>
        <div className="feed-row"><span>EXPENSE</span><strong>JPY {expense.toLocaleString()}</strong></div>
      </div>
    </section>
  );
}
