import { Activity, AlertTriangle, CircleDollarSign, PackageOpen } from 'lucide-react';
import { sales, stock } from '../data/mockData.js';

export default function HomePage({ socketState }) {
  const revenue = sales.reduce((sum, item) => sum + item.price, 0);
  const takeHome = sales.reduce((sum, item) => sum + item.price - item.cost - item.expense, 0);
  const alerts = stock.filter((item) => item.quantity <= item.threshold);

  return (
    <section className="page-grid">
      <article className="metric-card">
        <CircleDollarSign />
        <span>SALES</span>
        <strong>¥{revenue.toLocaleString()}</strong>
      </article>
      <article className="metric-card">
        <Activity />
        <span>TAKE HOME</span>
        <strong>¥{takeHome.toLocaleString()}</strong>
      </article>
      <article className="metric-card danger">
        <AlertTriangle />
        <span>STOCK ALERT</span>
        <strong>{alerts.length}</strong>
      </article>
      <article className="metric-card">
        <PackageOpen />
        <span>ONLINE STATE</span>
        <strong>{socketState.toUpperCase()}</strong>
      </article>
      <div className="wide-panel">
        <h2>ALERT FEED</h2>
        {alerts.map((item) => (
          <div className="feed-row" key={item.id}>
            <span>{item.name}</span>
            <strong>{item.quantity} / {item.threshold}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
