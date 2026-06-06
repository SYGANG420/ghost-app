import { Activity, AlertTriangle, CircleDollarSign, PackageOpen } from 'lucide-react';
import { sales, stock } from '../data/mockData.js';
import { statusJa, yen } from '../utils/format.js';

export default function HomePage({ socketState }) {
  const revenue = sales.reduce((sum, item) => sum + item.price, 0);
  const takeHome = sales.reduce((sum, item) => sum + item.price - item.cost - item.expense, 0);
  const alerts = stock.filter((item) => item.quantity <= item.threshold);

  return (
    <section className="page-stack">
      <div className="alert-strip">
        <span className="signal-dot yellow" />
        <strong>在庫監視 {alerts.length}件</strong>
        <span>リアルタイム運用ダッシュボード</span>
      </div>
      <div className="metric-grid">
        <article className="metric-card">
          <CircleDollarSign />
          <span>売上</span>
          <strong>{yen(revenue)}</strong>
        </article>
        <article className="metric-card">
          <Activity />
          <span>手取り</span>
          <strong>{yen(takeHome)}</strong>
        </article>
        <article className="metric-card danger">
          <AlertTriangle />
          <span>在庫警告</span>
          <strong>{alerts.length}</strong>
        </article>
        <article className="metric-card">
          <PackageOpen />
          <span>通信状態</span>
          <strong>{statusJa(socketState)}</strong>
        </article>
      </div>
      <div className="wide-panel cyber-card">
        <h2>警告フィード</h2>
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
